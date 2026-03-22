import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AttendanceEngine } from '../../attendance/engine/attendance.engine';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants/queue.constants';
import { Logger } from '@nestjs/common';
import { AttendanceService } from 'src/modules/attendance/attendance.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// @Processor(QUEUE_NAMES.ATTENDANCE)
@Processor(QUEUE_NAMES.CALCULATE_DAILY)
export class AttendanceProcessor extends WorkerHost {
  private readonly logger = new Logger(AttendanceProcessor.name);

  constructor(
    private attendanceEngine: AttendanceEngine,
    private attendanceService: AttendanceService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`[JOB START] ${job.name}`);

    switch (job.name) {
      // JOB CON: Tính toán cho từng người/ngày
      case JOB_NAMES.CALCULATE_DAILY: {
        const { employee_id, date, override_id } = job.data;

        this.logger.log(
          `[CALC] Processing employee=${employee_id}, date=${date}`,
        );

        await this.attendanceEngine.calculateDailyForEmployee(
          employee_id,
          new Date(date),
          override_id, // Truyền override_id từ job cha xuống
        );
        break;
      }

      // JOB CHA: Quét danh sách nhân viên bị ảnh hưởng
      case JOB_NAMES.SCAN_AFFECTED_EMPLOYEES: {
        const { overrideId } = job.data;

        this.logger.log(`[SCAN] Scanning for Override ID: ${overrideId}`);

        return await this.attendanceService.processScanAffectedEmployees(
          overrideId,
        );
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
