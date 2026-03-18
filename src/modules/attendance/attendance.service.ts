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
import { format } from 'date-fns';

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

    @InjectQueue(QUEUE_NAMES.CALCULATE_DAILY)
    private attendanceQueue: Queue,
  ) {}

  async processBatchPunches(
    inputs: RawPunchInput[],
  ): Promise<BatchPunchResult> {
    if (!inputs.length) {
      return {
        savedCount: 0,
        savedIds: [],
        message: 'No punches received.',
      };
    }
    // console.log('inputs',inputs)
    const companyId = inputs[0].company_id;

    const externalIds = [...new Set(inputs.map((i) => i.external_user_id))];

    const employees = await this.employeeRepo.find({
      where: {
        companyId,
        userId: In(externalIds),
      },
      select: ['id', 'userId'],
    });

    const employeeMap = new Map(employees.map((e) => [e.userId, e.id]));

    const validEntities = inputs
      .map((input) => {
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
      .filter((entity): entity is AttendancePunchRecord => entity !== null);

    if (!validEntities.length) {
      return {
        savedCount: 0,
        savedIds: [],
        message: 'No valid employees found.',
      };
    }

    const result = await this.punchRecordRepo.insert(validEntities);
    const savedIds = result.identifiers.map((id) => id.id);

    const jobMap = new Map<string, { employee_id: string; date: string }>();

    for (const entity of validEntities) {
      const punchDate = new Date(entity.punch_time);
      const dateKey = punchDate.toISOString().slice(0, 10); // yyyy-mm-dd

      const key = `${entity.employee_id}-${dateKey}`;

      if (!jobMap.has(key)) {
        jobMap.set(key, {
          employee_id: entity.employee_id,
          date: dateKey,
        });
      }
    }

    const uniqueJobs = Array.from(jobMap.values());

    if (uniqueJobs.length) {
      await this.attendanceQueue.addBulk(
        uniqueJobs.map((job) => ({
          name: JOB_NAMES.CALCULATE_DAILY,
          data: job,
          opts: {
            removeOnComplete: true,
            jobId: `calc-${job.employee_id}-${job.date}`,
          },
        })),
      );
    }

    return {
      savedCount: savedIds.length,
      savedIds: savedIds.map(String),
      message: 'Lark punches recorded and queued successfully.',
    };
  }

  async calculateDailyTimesheet(
    employeeId: string,
    date: Date,
  ): Promise<AttendanceDailyTimesheet> {
    return this.attendanceEngine.calculateDailyForEmployee(employeeId, date);
  }

  async calculateBatchDailyTimesheets(
    employeeIds: string[],
    date: Date,
  ): Promise<void> {
    for (const id of employeeIds) {
      try {
        await this.attendanceEngine.calculateDailyForEmployee(id, date);
      } catch (error) {
        console.error(`Error calculating for employee ${id}:`, error);
        // Có thể log hoặc throw tùy policy
      }
    }
  }

  async getTimesheetByDate(companyId: string, date: string) {
    try {
      const attendanceDate = new Date(date);

      const timesheets = await this.timesheetRepo
        .createQueryBuilder('timesheet')
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.punches', 'punches')
        .leftJoinAndSelect('timesheet.requests', 'requests')
        .where('timesheet.company_id = :companyId', { companyId })
        .andWhere('timesheet.attendance_date = :attendanceDate', {
          attendanceDate,
        })
        .orderBy('employee.fullName', 'ASC')
        .getMany();

      return timesheets;
    } catch (error) {
      console.error('❌ getTimesheetByDate ERROR:', error);
      throw error;
    }
  }

  async getMonthlyTimesheet(
    companyId: string,
    month: number,
    year: number,
    employeeId?: string,
  ) {
    const where: any = {
      company_id: companyId,
      month,
      year,
    };

    if (employeeId) {
      where.employee_id = employeeId;
    }

    return this.monthlyRepo.find({
      where,
      relations: ['employee'],
      order: {
        employee_id: 'ASC',
      },
    });
  }

  async generateMonthlyTimesheet(
    companyId: string,
    month: number,
    year: number,
    employeeId?: string,
  ) {
    const query = this.timesheetRepo
      .createQueryBuilder('d')
      .select('d.employee_id', 'employee_id')

      .addSelect(
        'SUM(d.actual_work_hours / NULLIF(d.total_work_hours_standard,0))',
        'total_work_days',
      )

      .addSelect('SUM(d.actual_work_hours)', 'total_work_hours')

      .addSelect('SUM(d.late_minutes)', 'total_late_minutes')

      .addSelect(
        'SUM(CASE WHEN d.is_late = true THEN 1 ELSE 0 END)',
        'total_late_days',
      )

      .addSelect(
        'SUM(CASE WHEN d.is_early_leave = true THEN 1 ELSE 0 END)',
        'total_early_leave_days',
      )

      .addSelect('SUM(d.early_leave_minutes)', 'total_early_leave_minutes')

      .addSelect(
        'SUM(CASE WHEN d.missing_check_in OR d.missing_check_out THEN 1 ELSE 0 END)',
        'total_missing_check',
      )

      .addSelect('SUM(d.ot_hours)', 'total_ot_hours')

      .addSelect('SUM(d.leave_hours / 8)', 'total_leave_days')

      .addSelect('SUM(d.remote_hours / 8)', 'total_remote_days')

      .where('d.company_id = :companyId', { companyId })
      .andWhere('d.month = :month', { month })
      .andWhere('d.year = :year', { year })
      .groupBy('d.employee_id');

    if (employeeId) {
      query.andWhere('d.employee_id = :employeeId', { employeeId });
    }

    const stats = await query.getRawMany();

    if (!stats.length) return [];

    const records = stats.map((s) => ({
      company_id: companyId,
      employee_id: s.employee_id,
      month,
      year,
      total_work_days: parseFloat(s.total_work_days || 0),
      total_work_hours: parseFloat(s.total_work_hours || 0),
      total_late_minutes: Number(s.total_late_minutes || 0),
      total_late_days: Number(s.total_late_days || 0),
      total_early_leave_minutes: Number(s.total_early_leave_minutes || 0),
      total_missing_check: Number(s.total_missing_check || 0),
      total_ot_hours: parseFloat(s.total_ot_hours || 0),
      total_leave_days: parseFloat(s.total_leave_days || 0),
      total_remote_days: parseFloat(s.total_remote_days || 0),
      last_sync_at: new Date(),
      confirmation_status: 'pending',
    }));

    await this.monthlyRepo.upsert(records, {
      conflictPaths: ['employee_id', 'company_id', 'month', 'year'],
    });

    return records;
  }
}
