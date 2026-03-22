import { Injectable, Logger } from '@nestjs/common';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { RawPunchInput } from './graphql/inputs/raw-punch.input';
import { BatchPunchResult } from './graphql/types/batch-punch-response';
import { InjectRepository } from '@nestjs/typeorm';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { Between, In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants';
import { Queue } from 'bullmq';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';
import { format } from 'date-fns';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { BackdateOverride } from './entities/backdate_overrides.entity';
import { RedisService } from 'src/redis/redis.service';
import { AttendanceJob } from './dto/attendance-job';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
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

    @InjectRepository(ShiftAssignment)
    private shiftAssignmentRepo: Repository<ShiftAssignment>,

    @InjectRepository(BackdateOverride)
    private overrideRepo: Repository<BackdateOverride>,

    @InjectQueue(QUEUE_NAMES.CALCULATE_DAILY)
    private attendanceQueue: Queue,

    private readonly redis: RedisService,
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
    // 1. Tính toán số ngày Thứ 7 được tính công (Lấy tổng - 2 ngày nghỉ)
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const totalSats = this.getTotalSaturdaysInMonth(firstDayOfMonth);
    const maxWorkSaturdays = totalSats - 2; // Quy tắc của Hải: Nghỉ cố định 2 ngày

    // 2. Subquery đánh số thứ tự ưu tiên cho Thứ 7
    const subQuery = this.timesheetRepo
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .addSelect(
        `ROW_NUMBER() OVER (
        PARTITION BY t.employee_id 
        ORDER BY t.actual_work_hours DESC, t.late_minutes ASC, t.early_leave_minutes ASC
      )`,
        'ranking',
      )
      .where('t.month = :month', { month })
      .andWhere('t.year = :year', { year })
      .andWhere('t.is_saturday_candidate = true');

    // 3. Query chính để SUM
    const query = this.timesheetRepo
      .createQueryBuilder('d')
      .leftJoin(`(${subQuery.getQuery()})`, 'sat_rank', 'sat_rank.id = d.id')
      .setParameters(subQuery.getParameters())
      .select('d.employee_id', 'employee_id')

      // TỔNG CÔNG (Ngày)
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN (d.actual_work_hours / NULLIF(d.total_work_hours_standard, 0))
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN (d.actual_work_hours / NULLIF(d.total_work_hours_standard, 0))
          ELSE 0 
        END
      )`,
        'total_work_days',
      )

      // TỔNG GIỜ LÀM
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN d.actual_work_hours
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN d.actual_work_hours
          ELSE 0 
        END
      )`,
        'total_work_hours',
      )

      // TỔNG PHÚT MUỘN (Chỉ tính cho những ngày được chọn công)
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN d.late_minutes
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN d.late_minutes
          ELSE 0 
        END
      )`,
        'total_late_minutes',
      )

      // TỔNG SỐ NGÀY MUỘN
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_late = true AND (d.is_saturday_candidate = false OR sat_rank.ranking <= ${maxWorkSaturdays}) THEN 1 
          ELSE 0 
        END
      )`,
        'total_late_days',
      )

      // TỔNG PHÚT VỀ SỚM
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN d.early_leave_minutes
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN d.early_leave_minutes
          ELSE 0 
        END
      )`,
        'total_early_leave_minutes',
      )

      // Các cột khác giữ nguyên vì không bị ảnh hưởng bởi logic Thứ 7
      .addSelect('SUM(d.ot_hours)', 'total_ot_hours')
      .addSelect('SUM(d.leave_hours / 8)', 'total_leave_days')
      .addSelect('SUM(d.remote_hours / 8)', 'total_remote_days')
      .addSelect(
        'SUM(CASE WHEN d.missing_check_in OR d.missing_check_out THEN 1 ELSE 0 END)',
        'total_missing_check',
      )

      .where('d.company_id = :companyId', { companyId })
      .andWhere('d.month = :month', { month })
      .andWhere('d.year = :year', { year })
      .groupBy('d.employee_id');

    // ... (Phần thực thi query và map kết quả giữ nguyên) ...
  }

  async createBackdateOverride(data: any) {
    const override = await this.overrideRepo.save(
      this.overrideRepo.create({
        entity_type: data.entityType,
        entity_id: data.entityId,
        company_id: data.companyId,
        effective_from: new Date(data.effectiveFrom),
        effective_to: data.effectiveTo ? new Date(data.effectiveTo) : null,
        override_values: data.overrideValues,
        reason: data.reason,
        recalc_status: 'PROCESSING',
      }),
    );

    // Đẩy job quét và nạp cache
    await this.attendanceQueue.add(
      JOB_NAMES.SCAN_AFFECTED_EMPLOYEES,
      { overrideId: override.id },
      { jobId: `scan-override-${override.id}`, removeOnComplete: true },
    );
    return override;
  }

  async processScanAffectedEmployees(overrideId: string) {
    const override = await this.overrideRepo.findOneBy({ id: overrideId });
    if (!override) return;
    this.logger.debug('[DEBUG] override:', override);
    const affectedEmpIds = await this.fallbackQueryFromEmployeeMaster(
      override.entity_type,
      override.entity_id,
      override.company_id,
    );

    this.logger.log(
      `[CACHE] Đang làm nóng cache cho ${affectedEmpIds.length} nhân viên...`,
    );
    for (const empId of affectedEmpIds) {
      await this.refreshEmployeeOverrideCache(empId, override.company_id);
    }

    const dates = this.getDatesBetween(
      new Date(override.effective_from),
      override.effective_to ? new Date(override.effective_to) : new Date(),
    );

    const jobs: AttendanceJob[] = [];
    const today = new Date();
    for (const empId of affectedEmpIds) {
      for (const date of dates) {
        if (date > today) continue;

        const dateStr = this.formatDate(date);

        const hasData = await this.checkAttendanceData(empId, dateStr);

        if (!hasData) continue;

        jobs.push({ employee_id: empId, date: dateStr });
      }
    }

    const chunks = this.chunkArray(jobs, 1000);
    for (const chunk of chunks) {
      await this.attendanceQueue.addBulk(
        chunk.map((j) => ({
          name: JOB_NAMES.CALCULATE_DAILY,
          data: {
            employee_id: j.employee_id,
            date: j.date,
            override_id: override.id,
          },
          opts: {
            jobId: `calc-${override.id}-${j.employee_id}-${j.date}`,
            removeOnComplete: true,
            removeOnFail: 1000,
            attempts: 1,
          },
        })),
      );
    }

    await this.overrideRepo.update(override.id, { recalc_status: 'COMPLETED' });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
      array.slice(i * size, i * size + size),
    );
  }

  private getTotalSaturdaysInMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      if (new Date(year, month, day).getDay() === 6) {
        count++;
      }
    }
    return count;
  }

  private async fallbackQueryFromEmployeeMaster(
    type: string,
    id: string,
    company_id: string,
  ): Promise<string[]> {
    console.log('================ DEBUG fallbackQuery =================');
    console.log('[INPUT]', { type, id, company_id });

    switch (type) {
      case 'SHIFT_ASSIGNMENT': {
        console.log('[CASE] SHIFT_ASSIGNMENT');

        const assignments = await this.shiftAssignmentRepo.find({
          where: { shiftId: id, companyId: company_id, isActive: true },
          select: ['employeeId'],
        });

        console.log('[SHIFT_ASSIGNMENT] raw assignments:', assignments);

        const result = [...new Set(assignments.map((a) => a.employeeId))];

        console.log('[SHIFT_ASSIGNMENT] employeeIds:', result);
        console.log('[COUNT]:', result.length);

        return result;
      }

      case 'SHIFT': {
        console.log('[CASE] SHIFT');

        const empsWithDefaultShift = await this.employeeRepo.find({
          where: {
            attendanceGroup: { defaultShiftId: id },
            companyId: company_id,
          },
          select: ['id'],
        });

        console.log('[SHIFT] employees:', empsWithDefaultShift);

        const result = empsWithDefaultShift.map((e) => e.id);

        console.log('[SHIFT] employeeIds:', result);
        console.log('[COUNT]:', result.length);

        return result;
      }

      case 'ATTENDANCE_GROUP': {
        console.log('[CASE] ATTENDANCE_GROUP');

        const groupEmps = await this.employeeRepo.find({
          where: { attendanceGroup: { id }, companyId: company_id },
          select: ['id'],
        });

        console.log('[GROUP] employees:', groupEmps);

        const result = groupEmps.map((e) => e.id);

        console.log('[GROUP] employeeIds:', result);
        console.log('[COUNT]:', result.length);

        return result;
      }

      case 'EMPLOYEE': {
        console.log('[CASE] EMPLOYEE');

        console.log('[EMPLOYEE] return:', [id]);

        return [id];
      }

      default: {
        console.log('[CASE] DEFAULT - UNKNOWN TYPE');

        return [];
      }
    }
  }

  private async refreshEmployeeOverrideCache(
    employeeId: string,
    companyId: string,
  ) {
    console.log(
      '================ DEBUG refreshEmployeeOverrideCache =================',
    );
    console.log('[INPUT]', { employeeId, companyId });

    // 1. Lấy employee
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId: companyId },
      relations: ['attendanceGroup', 'departments'],
    });

    console.log('[EMPLOYEE]', employee);

    if (!employee) {
      console.log('[EXIT] employee not found');
      return;
    }

    // 2. Lấy shift assignments
    const assignments = await this.shiftAssignmentRepo.find({
      where: { employeeId, companyId, isActive: true },
      select: ['shiftId'],
    });

    console.log('[ASSIGNMENTS]', assignments);

    const shiftIds = [...new Set(assignments.map((a) => a.shiftId))];

    console.log('[SHIFT IDS]', shiftIds);

    // 3. Build identityIds
    const identityIds = {
      employee: employeeId,
      attendanceGroup: employee.attendanceGroup?.id,
      departments: employee.departments?.map((d) => d.id) || [],
      shiftIds,
      defaultShiftId: employee.attendanceGroup?.defaultShiftId,
    };

    console.log('[IDENTITY IDS]', identityIds);

    // 4. Query overrides
    const whereConditions: any[] = [
      { entity_type: 'EMPLOYEE', entity_id: employeeId, is_active: true },
    ];

    if (identityIds.attendanceGroup) {
      whereConditions.push({
        entity_type: 'ATTENDANCE_GROUP',
        entity_id: identityIds.attendanceGroup,
        is_active: true,
      });
    }

    if (identityIds.departments.length > 0) {
      whereConditions.push({
        entity_type: 'DEPARTMENT',
        entity_id: In(identityIds.departments),
        is_active: true,
      });
    }

    if (identityIds.shiftIds.length > 0) {
      whereConditions.push({
        entity_type: 'SHIFT',
        entity_id: In(identityIds.shiftIds),
        is_active: true,
      });
    }

    if (identityIds.defaultShiftId) {
      whereConditions.push({
        entity_type: 'SHIFT',
        entity_id: identityIds.defaultShiftId,
        is_active: true,
      });
    }

    console.log('[WHERE CONDITIONS]', JSON.stringify(whereConditions, null, 2));

    const allActive = await this.overrideRepo.find({
      where: whereConditions,
      order: { createdAt: 'ASC' } as any,
    });

    console.log('[OVERRIDES FOUND]', allActive);
    console.log('[OVERRIDE COUNT]', allActive.length);

    // 5. Cache
    const cacheKey = `overrides:emp:${employeeId}`;

    if (allActive.length > 0) {
      const sevenDaysInMs = 86400 * 7 * 1000;

      await this.redis.setParse(cacheKey, allActive, sevenDaysInMs);

      console.log('[CACHE SET]', cacheKey);
    } else {
      await this.redis.client.del(cacheKey);

      console.log('[CACHE DEL]', cacheKey);
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();

    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  private getDatesBetween(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);

    while (current <= last) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private async checkAttendanceData(empId: string, dateStr: string) {
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');

    const [hasPunch] = await Promise.all([
      this.punchRecordRepo.exist({
        where: {
          employee_id: empId,
          punch_time: Between(start, end),
        },
      }),
    ]);

    return hasPunch;
  }
}
