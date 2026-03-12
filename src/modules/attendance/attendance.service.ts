import { Injectable } from '@nestjs/common';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { RawPunchInput } from './graphql/inputs/raw-punch.input';
import { BatchPunchResult } from './graphql/types/batch-punch-response';
import { InjectRepository } from '@nestjs/typeorm';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants';
import { Queue } from 'bullmq';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';

@Injectable()
export class AttendanceService {
  constructor(
    private attendanceEngine: AttendanceEngine,

    @InjectRepository(AttendancePunchRecord)
    private punchRecordRepo: Repository<AttendancePunchRecord>,

    @InjectRepository(AttendanceMonthlyTimesheet)
    private monthlyRepo: Repository<AttendanceMonthlyTimesheet>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,

    @InjectQueue(QUEUE_NAMES.ATTENDANCE) 
    private attendanceQueue: Queue,
  ) {}

  async processBatchPunches(inputs: RawPunchInput[]): Promise<BatchPunchResult> {
    if (!inputs.length) {
      return {
        savedCount: 0,
        savedIds: [],
        message: 'No punches received.',
      };
    }
    // console.log('inputs',inputs)
    const companyId = inputs[0].company_id;

    const externalIds = [...new Set(inputs.map(i => i.external_user_id))];

    const employees = await this.employeeRepo.find({
      where: {
        companyId,
        userId: In(externalIds),
      },
      select: ['id', 'userId'],
    });

    const employeeMap = new Map(
      employees.map(e => [e.userId, e.id])
    );

    const validEntities = inputs
      .map(input => {
        const employeeId = employeeMap.get(input.external_user_id);

        if (!employeeId) {
          console.log('Employee not found:', input.external_user_id);
          return null;
        }

        return this.punchRecordRepo.create({
          ...input,
          employee_id: employeeId,
        });
      })
      .filter(
        (entity): entity is AttendancePunchRecord => entity !== null
      );

    if (!validEntities.length) {
      return {
        savedCount: 0,
        savedIds: [],
        message: 'No valid employees found.',
      };
    }

    const result = await this.punchRecordRepo.insert(validEntities);
    const savedIds = result.identifiers.map(id => id.id);

    const calculationJobs = validEntities.map(entity => ({
      employee_id: entity.employee_id,
      date: new Date(entity.punch_time).toISOString().split('T')[0],
    }));

    const uniqueJobs = Array.from(
      new Set(calculationJobs.map(j => JSON.stringify(j)))
    ).map(s => JSON.parse(s));

    await this.attendanceQueue.addBulk(
      uniqueJobs.map(job => ({
        name: JOB_NAMES.CALCULATE_DAILY,
        data: job,
        opts: {
          removeOnComplete: true,
          jobId: `calc-${job.employee_id}-${job.date}`,
        },
      }))
    );

    return {
      savedCount: savedIds.length,
      savedIds: savedIds.map(String),
      message: 'Lark punches recorded and queued successfully.',
    };
  }

  async calculateDailyTimesheet(employeeId: string, date: Date): Promise<AttendanceDailyTimesheet> {
    return this.attendanceEngine.calculateDailyForEmployee(employeeId, date);
  }

  async calculateBatchDailyTimesheets(employeeIds: string[], date: Date): Promise<void> {
    for (const id of employeeIds) {
      try {
        await this.attendanceEngine.calculateDailyForEmployee(id, date);
      } catch (error) {
        console.error(`Error calculating for employee ${id}:`, error);
        // Có thể log hoặc throw tùy policy
      }
    }
  }

  async getTimesheetByDate(companyId: string, date: Date) {
    return this.timesheetRepo
      .createQueryBuilder('t')
      .leftJoin('t.employee', 'e')
      .select('t') 
      .addSelect([
        'e.id',
        'e.userId',
        'e.userName',
        'e.fullName',
        'e.larkId',
        'e.email',
        'e.phoneNumber',
      ])
      .where('t.company_id = :companyId', { companyId })
      .andWhere('t.attendance_date = :date', { date })
      .orderBy('t.employee_id', 'ASC')
      .getMany();
  }
  async getTimesheetByMonth(companyId: string, month: number, year: number) {
    return this.timesheetRepo.find({
      where: {
        company_id: companyId,
        month,
        year,
      },
      relations: ['employee'],
      order: {
        attendance_date: 'ASC',
      },
    });
  }

async generateMonthlyTimesheet(
  companyId: string,
  month: number,
  year: number,
) {
  // Quan trọng: Kiểm tra đầu vào
  console.log(`Params: Company=${companyId}, Month=${month}, Year=${year}`);

  const query = this.timesheetRepo
    .createQueryBuilder('d')
    .select('d.employee_id', 'employee_id')
    .addSelect('SUM(CASE WHEN d.actual_work_hours > 0 THEN 1 ELSE 0 END)', 'total_work_days')
    .addSelect('SUM(CAST(d.actual_work_hours AS DECIMAL))', 'total_work_hours')
    .addSelect('SUM(CAST(d.total_work_hours_standard AS DECIMAL))', 'total_standard_hours')
    .addSelect('SUM(CASE WHEN d.is_late = true THEN 1 ELSE 0 END)', 'total_late_days')
    .addSelect('SUM(d.late_minutes)', 'total_late_minutes')
    .addSelect('SUM(d.early_leave_minutes)', 'total_early_leave_minutes')
    .addSelect('SUM(CASE WHEN d.missing_check_in = true OR d.missing_check_out = true THEN 1 ELSE 0 END)', 'total_missing_check')
    .addSelect('SUM(CAST(d.ot_hours AS DECIMAL))', 'total_ot_hours')
    .addSelect('SUM(CAST(d.leave_hours AS DECIMAL))', 'total_leave_hours')
    .addSelect('SUM(CASE WHEN d.is_remote = true THEN CAST(d.remote_hours AS DECIMAL) ELSE 0 END) / 8', 'total_remote_days')
    .addSelect('SUM(CAST(d.adjustment_hours AS DECIMAL))', 'total_adjustment_hours')
    
    // Sửa Where: Dùng ép kiểu thực tế của Postgres
    .where('d.company_id = :companyId', { companyId: companyId }) 
    .andWhere('d.month = :month', { month: Number(month) })
    .andWhere('d.year = :year', { year: Number(year) })
    .groupBy('d.employee_id');

  const rows = await query.getRawMany();

  if (!rows || rows.length === 0) {
    // Nếu vẫn ra [], hãy in câu SQL thực tế ra để chạy thử trên DB
    console.log("SQL Query:", query.getSql());
    return [];
  }

  // 2. Map dữ liệu (Sử dụng chuẩn xác kiểu dữ liệu)
  const records = rows.map(r => ({
    company_id: companyId,
    employee_id: r.employee_id.toString(), // Đảm bảo ID là string
    month: Number(month),
    year: Number(year),
    total_work_days: Number(r.total_work_days || 0),
    total_work_hours: parseFloat(r.total_work_hours || 0),
    total_standard_hours: parseFloat(r.total_standard_hours || 0),
    total_late_days: Number(r.total_late_days || 0),
    total_late_minutes: Number(r.total_late_minutes || 0),
    total_early_leave_minutes: Number(r.total_early_leave_minutes || 0),
    total_missing_check: Number(r.total_missing_check || 0),
    total_ot_hours: parseFloat(r.total_ot_hours || 0),
    total_leave_hours: parseFloat(r.total_leave_hours || 0),
    total_leave_days: parseFloat(r.total_leave_hours || 0) / 8,
    total_remote_days: parseFloat(r.total_remote_days || 0),
    total_adjustment_hours: parseFloat(r.total_adjustment_hours || 0),
    confirmation_status: 'pending'
  }));

  // 3. Insert/Upsert (Dùng save để TypeORM tự xử lý Mapping nếu upsert lỗi)
  // Lưu ý: records bây giờ là mảng các object thuần
  try {
    // Xóa dữ liệu cũ trước để tránh lỗi Duplicate Key Index
    await this.monthlyRepo.delete({ company_id: companyId, month, year });
    return await this.monthlyRepo.save(records);
  } catch (error) {
    console.error("Insert error:", error);
    throw error;
  }
}
}