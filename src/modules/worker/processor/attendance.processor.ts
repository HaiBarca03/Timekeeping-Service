import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AttendanceEngine } from '../../attendance/engine/attendance.engine';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants/queue.constants';
import { Logger } from '@nestjs/common';

@Processor(QUEUE_NAMES.ATTENDANCE)
export class AttendanceProcessor extends WorkerHost {
  private readonly logger = new Logger(AttendanceProcessor.name); // Thêm logger

  constructor(private attendanceEngine: AttendanceEngine) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`[JOB START] ${job.name}`);

    switch (job.name) {
      case JOB_NAMES.CALCULATE_DAILY: {
        const { employee_id, date } = job.data;

        this.logger.log(
          `Processing employee=${employee_id}, date=${date}`,
        );

        await this.attendanceEngine.calculateDailyForEmployee(
          employee_id,
          new Date(date),
        );
        break;
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}