import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { AttendanceEngine } from './engine/attendance.engine';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(AttendancePunchRecord)
    private readonly punchRepo: Repository<AttendancePunchRecord>,
    private readonly attendanceEngine: AttendanceEngine,
    private readonly dataSource: DataSource,
  ) { }

  // Chạy mỗi 15 phút một lần từ 1h đêm đến hết 4h sáng (để hoàn thành trước 4h30)
  // @Cron('0 */15 1-4 * * *', {
  //   timeZone: 'Asia/Ho_Chi_Minh',
  // })
  // 5p để chủ động test dữ liệu, sau này update lại thành 15p mỗi lần từ 1-4h sáng
  @Cron('*/2 * * * *')
  async handlePunchProcessing() {
    if (this.isProcessing) {
      this.logger.warn('[Cron] Previous job still running, skipping...');
      return;
    }

    this.isProcessing = true;
    const jobId = uuidv4();
    this.logger.log(`[Cron][${jobId}] Starting cycle...`);

    try {
      // 1. Claim bản ghi (Đã fix lấy result[0])
      const claimedRecords = await this.claimPunches(jobId, 500);

      if (!claimedRecords || claimedRecords.length === 0) {
        this.logger.log(`[Cron][${jobId}] No records to process.`);
        return;
      }

      this.logger.log(
        `[Cron][${jobId}] Processing ${claimedRecords.length} records.`,
      );

      // 2. Gom nhóm (Đã fix mapping snake_case)
      const groups = this.groupPunchesByEmployeeAndDate(claimedRecords, jobId);

      for (const group of groups) {
        const { employeeId, date, punchIds } = group;
        try {
          this.logger.debug(
            `[Cron][${jobId}] Calc: Emp ${employeeId} on ${date}`,
          );

          // Tính toán công
          await this.attendanceEngine.calculateDailyForEmployee(
            employeeId,
            new Date(date),
          );

          // Thành công
          await this.punchRepo.update(
            { id: In(punchIds) },
            {
              processing_status: 'PROCESSED',
              processed_at: new Date(),
              last_error: null,
              job_id: jobId,
            },
          );
        } catch (error: any) {
          this.logger.error(
            `[Cron][${jobId}] Error Emp ${employeeId}: ${error.message}`,
          );
          await this.punchRepo.update(
            { id: In(punchIds) },
            {
              processing_status: 'FAILED',
              retry_count: () => 'retry_count + 1',
              last_error: error.message,
              processed_at: new Date(),
              job_id: jobId,
            },
          );
        }
      }

      this.logger.log(`[Cron][${jobId}] Finished.`);
    } catch (error: any) {
      this.logger.error(`[Cron][${jobId}] Fatal: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async claimPunches(
    jobId: string,
    limit: number,
  ): Promise<AttendancePunchRecord[]> {
    // Logic: Bốc PENDING, FAILED, hoặc PROCESSING bị treo quá 15p
    const query = `
      UPDATE attendance_punch_records
      SET 
        processing_status = 'PROCESSING',
        job_id = $1,
        updated_at = NOW()
      WHERE id IN (
        SELECT id FROM attendance_punch_records
        WHERE 
          (processing_status = 'PENDING' 
           OR (processing_status = 'FAILED' AND retry_count < 5)
           OR (processing_status = 'PROCESSING' AND updated_at < NOW() - INTERVAL '15 minutes'))
        ORDER BY processing_status DESC, id ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
    const result = await this.dataSource.query(query, [jobId, limit]);
    // Postgres trả về [data_array, count], ta lấy cái đầu tiên
    return Array.isArray(result) ? result[0] : [];
  }

  private groupPunchesByEmployeeAndDate(records: any[], jobId: string) {
    const taskMap = new Map<
      string,
      { employeeId: string; date: string; punchIds: any[] }
    >();

    for (const record of records) {
      // Mapping chính xác tên cột từ Postgres (luôn là snake_case)
      const rawId = record.id;
      const rawEmpId = record.employee_id;
      const rawPunchTime = record.punch_time;

      if (!rawPunchTime) {
        this.logger.warn(`[Cron][${jobId}] Record ${rawId} has no punch_time`);
        continue;
      }

      const punchDate = new Date(rawPunchTime);
      if (isNaN(punchDate.getTime())) {
        this.logger.warn(
          `[Cron][${jobId}] Record ${rawId} has invalid date: ${rawPunchTime}`,
        );
        continue;
      }

      const dateKey = punchDate.toISOString().split('T')[0];
      const taskKey = `${rawEmpId}_${dateKey}`;

      let task = taskMap.get(taskKey);
      if (!task) {
        task = { employeeId: rawEmpId, date: dateKey, punchIds: [] };
        taskMap.set(taskKey, task);
      }
      task.punchIds.push(rawId);
    }

    return Array.from(taskMap.values());
  }
}
