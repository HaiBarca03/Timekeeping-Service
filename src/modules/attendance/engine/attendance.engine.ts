import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ShiftResolverService } from './services/shift-resolver.service';
import { PunchProcessingStrategy } from './strategies/punch-processing.strategy';
import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { LateEarlyStrategy } from './strategies/late-early.strategy';
import { OvertimeStrategy } from './strategies/overtime.strategy';
import { RemoteWorkStrategy } from './strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './strategies/workday-calculation.strategy';
import { CalculationContext } from './dto/calculation-context.dto';
import { AttendanceDailyTimesheet } from '../entities/attendance-daily-timesheet.entity';
import { AttendanceDailyPunch } from '../entities/attendance-daily-punch.entity';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { LeaveStrategy } from './strategies/leave.strategy';
import { StorePunchStrategy } from './strategies/store-punch.strategy';
import { BackdateOverride } from '../entities/backdate_overrides.entity';
import { RedisService } from 'src/redis/redis.service';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { formatDate } from 'date-fns';
import { SwapStrategy } from './strategies/swap.strategy';
import { MaternityStrategy } from './strategies/maternity.strategy';
import { CorrectionStrategy } from './strategies/correction.strategy';
// import { BackdateOverride } from '../entities/backdate_overrides.entity';

@Injectable()
export class AttendanceEngine {
  private readonly logger = new Logger(AttendanceEngine.name);
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(AttendanceDailyPunch)
    private punchRepo: Repository<AttendanceDailyPunch>,

    @InjectRepository(ShiftAssignment)
    private shiftAssignmentRepo: Repository<ShiftAssignment>,

    @InjectRepository(BackdateOverride)
    private overrideRepo: Repository<BackdateOverride>,

    private readonly redis: RedisService,

    private shiftResolver: ShiftResolverService,
    private punchStrategy: PunchProcessingStrategy,
    private breakStrategy: BreakTimeStrategy,
    private storePunchStrategy: StorePunchStrategy,
    private lateEarlyStrategy: LateEarlyStrategy,
    private overtimeStrategy: OvertimeStrategy,
    private remoteStrategy: RemoteWorkStrategy,
    private workdayStrategy: WorkdayCalculationStrategy,
    private leaveStrategy: LeaveStrategy,
    private swapStrategy: SwapStrategy,
    private maternityStrategy: MaternityStrategy,
    private correctionStrategy: CorrectionStrategy,
  ) {}

  async calculateDailyForEmployee(
    employeeId: string,
    date: Date,
    overrideId?: string,
  ): Promise<AttendanceDailyTimesheet> {
    this.logger.debug(`================ ENGINE START ================`);
    this.logger.debug(
      `EmployeeId: ${employeeId} | Date: ${date.toISOString().split('T')[0]}`,
    );

    const employee = await this.getEmployee(employeeId);
    const context = new CalculationContext(employee, date);
    context.attendanceGroupCode = context.employee.attendanceGroup?.code;

    // ===== STEP 0: SHIFT RESOLVE & SWAP =====
    this.logger.debug(`STEP 0: SHIFT RESOLVE & SWAP STRATEGY START`);
    // Lấy ca mặc định
    context.shiftContext = await this.shiftResolver.resolveShift(context);
    // Kiểm tra đổi ca để ghi đè ShiftContext nếu có đơn
    await this.swapStrategy.process(context);
    this.logger.debug(
      `STEP 0 RESULT: Shift resolved ${context.shiftContext?.shift?.code || 'OFF'}`,
    );

    // ===== STEP 1: MATERNITY CHECK =====
    this.logger.debug(`STEP 1: MATERNITY STRATEGY START`);
    await this.maternityStrategy.process(context);
    this.logger.debug(
      `STEP 1 RESULT: isMaternityShift = ${context.isMaternityShift}`,
    );

    // ===== STEP 2: PUNCH PROCESSING =====
    this.logger.debug(`STEP 2: PUNCH PROCESSING START`);
    if (context.employee.attendanceGroup?.code === 'STORE_GROUP') {
      const rawPunches = await this.punchStrategy.getRawPunches(context);
      this.storePunchStrategy.process(context, rawPunches);
    } else {
      await this.punchStrategy.process(context);
    }
    this.logger.debug(
      `STEP 2 RESULT: Punches count = ${context.punches?.length}`,
    );

    // ===== STEP 3: BREAK & LATE EARLY =====
    this.logger.debug(`STEP 3: BREAK & LATE-EARLY STRATEGY START`);
    this.breakStrategy.process(context);

    if (context.employee.attendanceGroup?.code !== 'STORE_GROUP') {
      this.lateEarlyStrategy.process(context);
    }
    this.logger.debug(
      `STEP 3 RESULT: Late: ${context.totalLateMinutes}m, Early: ${context.totalEarlyMinutes}m`,
    );

    // ===== STEP 4: ADJUSTMENT & CORRECTION =====
    this.logger.debug(`STEP 4: CORRECTION STRATEGY START`);
    // Chạy sau LateEarly để "xóa phạt" nếu có đơn giải trình/điều chỉnh
    await this.correctionStrategy.process(context);
    this.logger.debug(
      `STEP 4 RESULT: isManualCorrected = ${context['isManualCorrected'] || false}`,
    );

    // ===== STEP 5: OTHER REQUESTS (REMOTE, OT, LEAVE) =====
    this.logger.debug(`STEP 5: OTHER REQUESTS START`);
    await this.remoteStrategy.process(context);
    await this.overtimeStrategy.process(context);
    await this.leaveStrategy.process(context);
    this.logger.debug(
      `STEP 5 RESULT: OT mins: ${context.overtimeMinutes}, Leave hours: ${context.leaveHours}`,
    );

    // ===== STEP 6: WORKDAY CALCULATION =====
    this.logger.debug(`STEP 6: WORKDAY CALCULATION START`);
    // Tính toán dựa trên getStandardWorkHours đã được set bởi Maternity/Swap ở trên
    this.workdayStrategy.process(context);
    this.logger.debug(
      `STEP 6 RESULT: Final Workday: ${context.finalActualWorkday}, Total Hours: ${context.totalWorkedHours}`,
    );

    // ===== STEP 7: SAVE TIMESHEET =====
    this.logger.debug(`STEP 7: SAVE OR UPDATE TIMESHEET`);
    const result = await this.saveOrUpdateTimesheet(context);

    this.logger.debug(`================ ENGINE END ================`);

    return result;
  }

  private async getEmployee(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: [
        'company',
        'attendanceGroup',
        'attendanceGroup.defaultShift',
        'attendanceGroup.defaultShift.restRule',
        'attendanceMethod',
        'employeeType',
        'jobLevel',
      ],
    });

    if (!employee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  private async saveOrUpdateTimesheet(
    context: CalculationContext,
  ): Promise<AttendanceDailyTimesheet> {
    const groupCode = context.employee.attendanceGroup?.code;
    const isMaternity = !!context.employee['is_maternity_shift'];
    let timesheet =
      (await this.timesheetRepo.findOne({
        where: {
          employee_id: context.employee.id,
          attendance_date: context.date,
        },
      })) || new AttendanceDailyTimesheet();

    // --- 1. Thông tin định danh ---
    timesheet.company_id = context.companyId;
    timesheet.employee_id = context.employee.id;
    timesheet.attendance_date = context.date;
    timesheet.weekday = context.date.getDay();
    timesheet.month = context.date.getMonth() + 1;
    timesheet.year = context.date.getFullYear();

    // SỬA LỖI: Chấp nhận string | null
    timesheet.shift_id = context.shiftContext?.shift?.id ?? undefined;

    timesheet.is_saturday_candidate = context.isSaturdayCandidate || false;

    // --- 2. Dữ liệu Check-in/out ---
    const primaryPunch =
      context.punches && context.punches.length > 0 ? context.punches[0] : null;
    timesheet.is_configured_off_day = context.isConfiguredOffDay || false;

    timesheet.check_in_raw = primaryPunch?.check_in_time ?? null;
    timesheet.check_out_raw = primaryPunch?.check_out_time ?? null;
    timesheet.check_in_actual = primaryPunch?.check_in_time ?? null;
    timesheet.check_out_actual = primaryPunch?.check_out_time ?? null;

    timesheet.check_in_result = primaryPunch?.miss_check_in
      ? 'Lack'
      : context.totalLateMinutes > 0
        ? 'Late'
        : 'InTime';
    timesheet.check_out_result = primaryPunch?.miss_check_out
      ? 'Lack'
      : context.totalEarlyMinutes > 0
        ? 'Early'
        : 'OutTime';

    // --- 3. Chỉ số tính toán ---
    timesheet.late_minutes = context.totalLateMinutes;
    timesheet.early_leave_minutes = context.totalEarlyMinutes;
    timesheet.work_minutes = Math.round(context.totalWorkedHours * 60);
    timesheet.actual_work_hours = context.totalWorkedHours;

    if (context.attendanceGroupCode === 'STORE_GROUP') {
      // const standardHours = context.shiftContext?.getStandardWorkHours() || 8;
      const standardHours = context.shiftContext
        ? context.shiftContext.getStandardWorkHours(isMaternity, groupCode)
        : isMaternity && groupCode === 'STORE_GROUP'
          ? 7
          : 8;
      timesheet.total_work_hours_standard = standardHours;

      // if (context.totalWorkedHours > standardHours) {
      //   timesheet.is_redundant = true;
      //   timesheet.work_hours_redundant =
      //     context.totalWorkedHours - standardHours;

      //   this.logger.debug(
      //     `REDUNDANT WORK DETECTED → ${timesheet.work_hours_redundant} hours`,
      //   );
      // } else {
      //   timesheet.is_redundant = false;
      //   timesheet.work_hours_redundant = 0;
      // }
      if (context.totalWorkedHours > standardHours) {
        // Nếu làm 10h, ca 8h -> work_hours = 8, redundant = 2
        timesheet.actual_work_hours = standardHours;
        timesheet.work_minutes = Math.round(standardHours * 60);

        timesheet.is_redundant = true;
        timesheet.work_hours_redundant =
          context.totalWorkedHours - standardHours;
      } else {
        // Nếu làm 4h, ca 8h -> work_hours = 4, redundant = 0
        timesheet.actual_work_hours = context.totalWorkedHours;
        timesheet.work_minutes = Math.round(context.totalWorkedHours * 60);

        timesheet.is_redundant = false;
        timesheet.work_hours_redundant = 0;
      }
    }

    timesheet.total_work_hours_standard =
      context.shiftContext?.getStandardWorkHours() || 8;

    // timesheet.rest_minutes =
    //   context.shiftContext?.restRule?.reduce((sum, r) => sum + 60, 0) || 0;

    timesheet.rest_minutes = context['totalRestMinutesValue'] || 0;

    // --- 4. Trạng thái vi phạm & Đơn từ ---
    timesheet.missing_check_in = !!primaryPunch?.miss_check_in;
    timesheet.missing_check_out = !!primaryPunch?.miss_check_out;
    timesheet.is_late = context.totalLateMinutes > 0;
    timesheet.is_early_leave = context.totalEarlyMinutes > 0;

    // SỬA LỖI: Đảm bảo context.leaveHours đã được định nghĩa trong DTO
    timesheet.is_leave = (context.leaveHours ?? 0) > 0;
    timesheet.leave_hours = context.leaveHours ?? 0;

    timesheet.is_remote = context.onlineValue + context.businessTripValue > 0;
    timesheet.remote_hours =
      (context.onlineValue + context.businessTripValue) *
      timesheet.total_work_hours_standard;

    timesheet.is_ot = (context.overtimeMinutes ?? 0) > 0;
    timesheet.ot_hours = (context.overtimeMinutes ?? 0) / 60; // Giờ OT thực tế
    // timesheet.ot_minutes = context.overtimeMinutes;

    const currentWorkday = context.finalActualWorkday ?? 0;

    if (currentWorkday >= 1) timesheet.attendance_status = 'Full';
    else if (currentWorkday > 0) timesheet.attendance_status = 'Partial';
    else timesheet.attendance_status = 'Lack';

    // --- 5. Meta ---
    timesheet.calculation_version = 'v1.0.2';
    timesheet.calculated_at = new Date();
    timesheet.is_recalculated = true;

    // Nếu Entity thực sự không có actual_workday, hãy xóa dòng này hoặc thêm vào Entity
    // timesheet.actual_workday = currentWorkday;
    this.logger.debug(
      JSON.stringify(
        {
          employee: context.employee.id,
          date: context.date,
          late: context.totalLateMinutes,
          early: context.totalEarlyMinutes,
          workHours: context.totalWorkedHours,
        },
        null,
        2,
      ),
    );
    return await this.timesheetRepo.save(timesheet);
  }

  // private combineDateAndTime(baseDate: Date, timeStr: string): Date {
  //   const [hours, minutes] = timeStr.split(':').map(Number);
  //   const result = new Date(baseDate);
  //   // Quan trọng: Phải set theo giờ Local (hoặc UTC tùy theo cách hệ thống bạn lưu trữ)
  //   // Ở đây tôi dùng setHours (local) vì log của bạn hiển thị GMT+0700
  //   result.setHours(hours, minutes, 0, 0);
  //   return result;
  // }

  private combineDateAndTime(baseDate: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(baseDate);
    // Lấy giờ nhập vào (9h) trừ 7 để ra giờ UTC (2h sáng)
    result.setUTCHours(hours - 7, minutes, 0, 0);
    return result;
  }

  private formatDate(date: Date): string {
    // Đảm bảo trả về yyyy-MM-dd chuẩn để so sánh chuỗi
    return formatDate(new Date(date), 'yyyy-MM-dd');
  }
}
