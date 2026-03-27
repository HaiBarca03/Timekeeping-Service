import { Injectable, Logger } from '@nestjs/common';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { RawPunchInputDto } from './engine/dto/raw-punch.input';
import { BatchPunchResult } from './engine/dto/batch-punch-response';
import { InjectRepository } from '@nestjs/typeorm';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { Between, In, Repository } from 'typeorm';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';
import { format } from 'date-fns';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { BackdateOverride } from './entities/backdate_overrides.entity';
import { AttendanceJob } from './dto/attendance-job';
import { Shift } from '../master-data/entities/shift.entity';
import { AttendanceGroup } from '../master-data/entities/attendance-group.entity';

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

    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,

    @InjectRepository(AttendanceGroup)
    private attendanceGroupRepo: Repository<AttendanceGroup>,


    @InjectRepository(BackdateOverride)
    private overrideRepo: Repository<BackdateOverride>,
  ) { }

  async processBatchPunches(
    inputs: RawPunchInputDto[],
  ): Promise<BatchPunchResult> {
    if (!inputs.length) {
      return {
        savedCount: 0,
        savedIds: [],
        total: 0,
        failedCount: 0,
        message: 'No punches received.',
      };
    }

    this.logger.log(`Processing batch of ${inputs.length} punches...`);
    const companyId = inputs[0].company_id;
    const errors: Array<{ external_user_id: string; reason: string }> = [];
    const totalCount = inputs.length;

    // 1. Lọc và ánh xạ Employee
    const externalIds = [...new Set(inputs.map((i) => i.external_user_id))];
    const employees = await this.employeeRepo.find({
      where: {
        companyId,
        userId: In(externalIds),
      },
      select: ['id', 'userId'],
    });

    const employeeMap = new Map(employees.map((e) => [e.userId, e.id]));

    // Tìm các ID không tồn tại trong DB (nhưng có trong inputs)
    externalIds.forEach(id => {
      if (!employeeMap.has(id)) {
        errors.push({ external_user_id: id, reason: 'Employee not found in timekeeping system' });
      }
    });

    // 2. Chuẩn bị entities hợp lệ
    const validEntities: AttendancePunchRecord[] = [];
    for (const input of inputs) {
      const employeeId = employeeMap.get(input.external_user_id);
      if (employeeId) {
        validEntities.push(this.punchRecordRepo.create({
          ...input,
          employee_id: employeeId,
        }));
      }
    }

    if (validEntities.length === 0) {
      return {
        total: totalCount,
        savedCount: 0,
        failedCount: errors.length,
        errors,
        message: 'No valid records to save.',
      };
    }

    // 3. Insert theo chunk để tối ưu và cô lập lỗi
    const CHUNK_SIZE = 500;
    let savedCountValue = 0;
    const savedIds: string[] = [];

    for (let i = 0; i < validEntities.length; i += CHUNK_SIZE) {
      const chunk = validEntities.slice(i, i + CHUNK_SIZE);
      try {
        const result = await this.punchRecordRepo.insert(chunk);
        savedCountValue += chunk.length;
        savedIds.push(...result.identifiers.map(id => String(id.id)));
      } catch (chunkError) {
        this.logger.error(`Error in chunk starting at ${i}: ${chunkError.message}. Falling back to individual inserts for this chunk.`);

        // Nếu chunk lỗi, thử insert từng cái để biết cái nào lỗi cụ thể
        for (const entity of chunk) {
          try {
            const result = await this.punchRecordRepo.insert(entity);
            savedCountValue += 1;
            savedIds.push(String(result.identifiers[0].id));
          } catch (individualError) {
            errors.push({
              external_user_id: (entity as any).external_user_id || 'unknown',
              reason: `Database error: ${individualError.message}`,
            });
          }
        }
      }
    }

    this.logger.log(`Batch complete. Saved: ${savedCountValue}, Errors: ${errors.length}`);

    return {
      total: totalCount,
      savedCount: savedCountValue,
      failedCount: errors.length,
      savedIds,
      errors: errors.length > 50 ? [...errors.slice(0, 50), { external_user_id: '...', reason: `And ${errors.length - 50} more errors...` }] : errors,
      message: errors.length > 0 ? 'Batch processed with some errors.' : 'Batch processed successfully.',
    };
  }

  async calculateDailyBatch(companyId: string, dateStr?: string) {
    let date: Date;
    if (dateStr) {
      date = new Date(dateStr);
    } else {
      // Mặc định là ngày n-1 (hôm qua)
      date = new Date();
      date.setDate(date.getDate() - 1);
    }

    const dateOnly = this.formatDate(date);
    this.logger.log(
      `[Batch Calc] Starting calculation for company ${companyId} on date ${dateOnly}`,
    );

    // 1. Lấy danh sách nhân viên trong công ty
    const employees = await this.employeeRepo.find({
      where: { companyId },
      select: ['id'],
    });

    this.logger.log(`Found ${employees.length} employees to process.`);

    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
    };

    // 2. Lặp và tính toán
    for (const emp of employees) {
      try {
        await this.attendanceEngine.calculateDailyForEmployee(emp.id, date);
        results.success++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate for employee ${emp.id}: ${error.message}`,
        );
        results.failed++;
      }
    }

    this.logger.log(`[Batch Calc] Finished: ${results.success} success, ${results.failed} failed.`);
    return results;
  }

  /**
   * Tính toán công cho 1 nhân viên dựa trên các ngày có dữ liệu punch record
   * Chỉ đọc dữ liệu để check, không update status của PunchRecord
   */
  async calculateForEmployeeByPunchRecords(companyId: string, employeeId: string) {
    this.logger.log(`[Check Calc] Starting check for employee ${employeeId} in company ${companyId}`);

    // 1. Lấy danh sách các ngày (day) duy nhất mà nhân viên này có dữ liệu chấm công
    // Dùng queryBuilder để lấy distinct 'day' từ bảng attendance_punch_records
    const punchDays = await this.punchRecordRepo
      .createQueryBuilder('punch')
      .select('punch.day')
      .where('punch.company_id = :companyId', { companyId })
      .andWhere('punch.employee_id = :employeeId', { employeeId })
      .distinct(true)
      .getRawMany();

    if (!punchDays || punchDays.length === 0) {
      this.logger.warn(`No punch records found for employee ${employeeId}`);
      return { message: 'No data to calculate', success: 0 };
    }

    this.logger.log(`Found ${punchDays.length} days with punch records.`);

    const results: {
      employeeId: string;
      totalDays: number;
      details: any[]; // Định nghĩa là mảng bất kỳ để có thể push object vào
    } = {
      employeeId,
      totalDays: punchDays.length,
      details: [],
    };

    // 2. Lặp qua từng ngày để tính toán
    for (const record of punchDays) {
      const dateStr = record.punch_day.toString(); // Giả sử format 20260325
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const calcDate = new Date(year, month, day);

      try {
        // Gọi Engine để tính toán. 
        // LƯU Ý: Nếu hàm calculateDailyForEmployee của bạn có logic UPDATE DB, 
        // bạn nên cân nhắc tạo một hàm riêng trong Engine chỉ để return kết quả (dry-run).
        const dailyResult = await this.attendanceEngine.calculateDailyForEmployee(employeeId, calcDate);

        results.details.push({
          date: this.formatDate(calcDate),
          status: 'Success',
          result: dailyResult // Kết quả trả về từ engine
        });
      } catch (error) {
        results.details.push({
          date: this.formatDate(calcDate),
          status: 'Failed',
          error: error.message
        });
      }
    }

    return results;
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

      // TỔNG CÔNG (Công tính toán từ số giờ giới hạn - workday_count)
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN d.workday_count
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN d.workday_count
          ELSE 0 
        END
      )`,
        'workday_count',
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

      // GIỜ THỰC TẾ (IN/OUT)
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN d.in_out_work_hours
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN d.in_out_work_hours
          ELSE 0 
        END
      )`,
        'in_out_work_hours',
      )

      // NGÀY THỰC TẾ (IN/OUT)
      .addSelect(
        `SUM(
        CASE 
          WHEN d.is_saturday_candidate = false THEN d.in_out_workday_count
          WHEN d.is_saturday_candidate = true AND sat_rank.ranking <= ${maxWorkSaturdays} THEN d.in_out_workday_count
          ELSE 0 
        END
      )`,
        'in_out_workday_count',
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
      .groupBy('d.employee_id')
      .addGroupBy('d.user_id')
      .addSelect('d.user_id', 'user_id');

    if (employeeId) {
      query.andWhere('d.employee_id = :employeeId', { employeeId });
    }

    const results = await query.getRawMany();
    return results;
  }

  async syncMonthlyTimesheet(
    companyId: string,
    month: number,
    year: number,
    employeeId?: string,
  ) {
    this.logger.log(
      `[Monthly Sync] Starting sync for company ${companyId}, month ${month}/${year}`,
    );

    const aggregatedData = await this.generateMonthlyTimesheet(
      companyId,
      month,
      year,
      employeeId,
    );

    this.logger.log(`Aggregated data for ${aggregatedData.length} employees.`);

    const entities = aggregatedData.map((data) => ({
      company_id: companyId,
      employee_id: data.employee_id,
      user_id: data.user_id,
      month: month,
      year: year,
      total_work_days: parseFloat(data.total_work_days || 0),
      workday_count: parseFloat(data.workday_count || 0),
      total_work_hours: parseFloat(data.total_work_hours || 0),
      in_out_work_hours: parseFloat(data.in_out_work_hours || 0),
      in_out_workday_count: parseFloat(data.in_out_workday_count || 0),
      total_late_minutes: parseInt(data.total_late_minutes || 0),
      total_late_days: parseInt(data.total_late_days || 0),
      total_early_leave_minutes: parseInt(data.total_early_leave_minutes || 0),
      total_ot_hours: parseFloat(data.total_ot_hours || 0),
      total_leave_days: parseFloat(data.total_leave_days || 0),
      total_remote_days: parseFloat(data.total_remote_days || 0),
      total_missing_check: parseInt(data.total_missing_check || 0),
      last_sync_at: new Date(),
      confirmation_status: 'pending',
    }));

    if (entities.length > 0) {
      await this.monthlyRepo.upsert(entities, {
        conflictPaths: ['employee_id', 'company_id', 'month', 'year', 'user_id'],
        skipUpdateIfNoValuesChanged: true,
      });
    }

    this.logger.log(`[Monthly Sync] Finished syncing ${entities.length} records.`);
    return { success: true, count: entities.length };
  }

  async createBackdateOverride(data: any): Promise<BackdateOverride> {
    try {
      console.log('Dữ liệu chuẩn bị save:', data);

      let override: BackdateOverride | null = null;

      // 1. Nếu có source_id, thử tìm bản ghi cũ để update
      if (data.sourceId) {
        override = await this.overrideRepo.findOneBy({
          source_id: data.sourceId,
          company_id: data.companyId,
        });
      }

      if (override) {
        console.log(`[Override] Updating existing override: ${override.id}`);
        this.overrideRepo.merge(override, {
          entity_type: data.entityType,
          entity_id: data.entityId,
          effective_from: new Date(data.effectiveFrom),
          effective_to: data.effectiveTo ? new Date(data.effectiveTo) : null,
          override_values: data.overrideValues,
          reason: data.reason,
          recalc_status: 'PROCESSING', // Trigger tính lại khi update
        });
      } else {
        console.log(`[Override] Creating new override`);
        override = this.overrideRepo.create({
          entity_type: data.entityType,
          entity_id: data.entityId,
          source_id: data.sourceId,
          company_id: data.companyId,
          effective_from: new Date(data.effectiveFrom),
          effective_to: data.effectiveTo ? new Date(data.effectiveTo) : null,
          override_values: data.overrideValues,
          reason: data.reason,
          recalc_status: 'PROCESSING',
        });
      }

      return await this.overrideRepo.save(override);
    } catch (error) {
      console.error('LỖI KHI SAVE OVERRIDE:', error.message);
      throw error;
    }
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
      `[OVERRIDE] Đang xử lý ${affectedEmpIds.length} nhân viên bị ảnh hưởng...`,
    );

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

    this.logger.log(`[OVERRIDE] Total calculation jobs: ${jobs.length}`);
    for (const j of jobs) {
      try {
        await this.attendanceEngine.calculateDailyForEmployee(
          j.employee_id,
          new Date(j.date),
          override.id,
        );
      } catch (error) {
        this.logger.error(
          `Error calculating for employee ${j.employee_id} on ${j.date}: ${error.message}`,
        );
      }
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
          where: { originId: id, companyId: company_id, isActive: true },
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
        const shift = await this.shiftRepo.findOne({ where: { originId: id } });
        const empsWithDefaultShift = await this.employeeRepo.find({
          where: {
            attendanceGroup: { defaultShiftId: shift?.id },
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
        const group = await this.attendanceGroupRepo.findOne({ where: { originId: id } });
        console.log('[GROUP] group:', group);
        const groupEmps = await this.employeeRepo.find({
          where: { attendanceGroup: { id: group?.id }, companyId: company_id },
          select: ['id'],
        });

        console.log('[GROUP] employees:', groupEmps);

        const result = groupEmps.map((e) => e.id);

        console.log('[GROUP] employeeIds:', result);
        console.log('[COUNT]:', result.length);

        return result;
      }

      case 'DEPARTMENT': {
        console.log('[CASE] DEPARTMENT');
        const departmentEmps = await this.employeeRepo.find({
          where: { departments: { originId: id }, companyId: company_id },
          select: ['id'],
        });

        console.log('[DEPARTMENT] employees:', departmentEmps);

        const result = departmentEmps.map((e) => e.id);

        console.log('[DEPARTMENT] employeeIds:', result);
        console.log('[COUNT]:', result.length);

        return result;
      }

      case 'EMPLOYEE': {
        console.log('[CASE] EMPLOYEE');
        const emp = await this.employeeRepo.findOne({
          where: [
            { id: id, companyId: company_id },
            { originId: id, companyId: company_id }
          ],
          select: ['id']
        });

        console.log('[EMPLOYEE] return:', emp ? [emp.id] : []);

        return emp ? [emp.id] : [];
      }

      default: {
        console.log('[CASE] DEFAULT - UNKNOWN TYPE');

        return [];
      }
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
