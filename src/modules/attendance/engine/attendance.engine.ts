import { Injectable, Logger } from '@nestjs/common';
import { ATTENDANCE_GROUPS } from 'src/constants/attendance-group.constants';
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
// import { RedisService } from 'src/redis/redis.service';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { formatDate } from 'date-fns';
import { SwapStrategy } from './strategies/swap.strategy';
import { MaternityStrategy } from './strategies/maternity.strategy';
import { CorrectionStrategy } from './strategies/correction.strategy';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { AttendanceGroup } from 'src/modules/master-data/entities/attendance-group.entity';
import { AttendanceMethod } from 'src/modules/master-data/entities/attendance-method.entity';
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

    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,

    @InjectRepository(ShiftAssignment)
    private shiftAssignmentRepo: Repository<ShiftAssignment>,

    @InjectRepository(BackdateOverride)
    private overrideRepo: Repository<BackdateOverride>,
    @InjectRepository(AttendanceGroup)
    private attendanceGroupRepo: Repository<AttendanceGroup>,
    @InjectRepository(AttendanceMethod)
    private attendanceMethodRepo: Repository<AttendanceMethod>,

    // private readonly redis: RedisService,

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
  ) { }

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

    this.logger.debug(`STEP 0: SHIFT RESOLVE & SWAP STRATEGY START`);
    context.shiftContext = await this.shiftResolver.resolveShift(context);
    await this.swapStrategy.process(context);
    // this.logger.debug(`context`, context);
    this.logger.debug(
      `STEP 0 RESULT: Shift resolved ${context.shiftContext?.shift?.code || 'OFF'}`,
    );

    const overrides = await this.getApplicableOverrides(employeeId, date, overrideId);
    await this.applyOverridesToContext(context, overrides);
    if (overrides.length > 0) {
      this.logger.debug(`APPLIED ${overrides.length} BACKDATE OVERRIDES`);
    }

    this.logger.debug(`STEP 1: MATERNITY STRATEGY START`);
    await this.maternityStrategy.process(context);
    this.logger.debug(
      `STEP 1 RESULT: isMaternityShift = ${context.isMaternityShift}`,
    );

    this.logger.debug(`STEP 2: PUNCH PROCESSING START`);
    if (context.employee.attendanceGroup?.code === ATTENDANCE_GROUPS.STORE_GROUP_1 || context.employee.attendanceGroup?.code === ATTENDANCE_GROUPS.STORE_GROUP_2) {
      const rawPunches = await this.punchStrategy.getRawPunches(context);
      this.storePunchStrategy.process(context, rawPunches);
    } else {
      await this.punchStrategy.process(context);
    }
    this.logger.debug(
      `STEP 2 RESULT: Punches count = ${context.punches?.length}`,
    );

    this.logger.debug(`STEP 3: BREAK & LATE-EARLY STRATEGY START`);
    this.breakStrategy.process(context);

    const code = context.employee.attendanceGroup?.code;

    if (code !== ATTENDANCE_GROUPS.STORE_GROUP_1 && code !== ATTENDANCE_GROUPS.STORE_GROUP_2) {
      await this.lateEarlyStrategy.process(context);
    }
    this.logger.debug(
      `STEP 3 RESULT: Late: ${context.totalLateMinutes}m, Early: ${context.totalEarlyMinutes}m`,
    );

    this.logger.debug(`STEP 4: CORRECTION STRATEGY START`);
    await this.correctionStrategy.process(context);
    this.logger.debug(
      `STEP 4 RESULT: isManualCorrected = ${context['isManualCorrected'] || false}`,
    );

    this.logger.debug(`STEP 5: OTHER REQUESTS START`);
    await this.remoteStrategy.process(context);
    await this.overtimeStrategy.process(context);
    await this.leaveStrategy.process(context);
    this.logger.debug(
      `STEP 5 RESULT: OT mins: ${context.overtimeMinutes}, Leave hours: ${context.leaveHours}`,
    );

    this.logger.debug(`STEP 6: WORKDAY CALCULATION START`);
    this.workdayStrategy.process(context);

    // Sau workday calc: tính adjustmentHours nếu có CORRECTION
    // = standardHours - giờ thực tế chấm (phần giờ được bù thêm nhờ correction)
    if (context['isManualCorrected']) {
      const stdH = context['correctionStandardHours'] as number || 8;
      // Dùng inOutWorkHours (bounded bởi shift) thay vì totalWorkedHours (raw từ punch)
      // VD: check-in 7:55 nhưng ca 8:00 → inOutWorkHours tính từ 8:00
      context.adjustmentHours = parseFloat(
        Math.max(0, stdH - (context.inOutWorkHours || 0)).toFixed(2),
      );
    }

    this.logger.debug(
      `STEP 6 RESULT: Final Workday: ${context.finalActualWorkday}, Total Hours: ${context.totalWorkedHours}, AdjustmentHours: ${context.adjustmentHours}`,
    );

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
    const isMaternity = context.isMaternityShift || !!context.employee['is_maternity_shift'];
    let timesheet =
      (await this.timesheetRepo.findOne({
        where: {
          employee_id: context.employee.id,
          attendance_date: context.date,
        },
      })) || new AttendanceDailyTimesheet();

    timesheet.company_id = context.companyId;
    timesheet.employee_id = context.employee.id;
    timesheet.user_id = context.employee.userId;
    timesheet.attendance_date = context.date;
    timesheet.weekday = context.date.getDay();
    timesheet.month = context.date.getMonth() + 1;
    timesheet.year = context.date.getFullYear();

    timesheet.shift_id = context.shiftContext?.shift?.id ?? undefined;

    timesheet.is_saturday_candidate = context.isSaturdayCandidate || false;

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

    timesheet.late_minutes = context.totalLateMinutes;
    timesheet.early_leave_minutes = context.totalEarlyMinutes;

    const standardHours = context.shiftContext
      ? context.shiftContext.getStandardWorkHours(isMaternity, groupCode)
      : isMaternity && (groupCode === ATTENDANCE_GROUPS.STORE_GROUP_1 || groupCode === ATTENDANCE_GROUPS.STORE_GROUP_2)
        ? 7
        : 8;

    timesheet.total_work_hours_standard = standardHours;

    let maxActualWorkHours = standardHours;
    if (context.employee.is_angel && context.isHoliday) {
      maxActualWorkHours = standardHours * 2;
    }

    let cappedActualWorkHours = context.totalWorkedHours;
    if (cappedActualWorkHours > maxActualWorkHours) {
      cappedActualWorkHours = maxActualWorkHours;
    }

    timesheet.actual_work_hours = cappedActualWorkHours;
    timesheet.work_minutes = Math.round(cappedActualWorkHours * 60);

    timesheet.workday_count = parseFloat((context.finalActualWorkday ?? (cappedActualWorkHours / standardHours)).toFixed(2));

    timesheet.in_out_work_hours = parseFloat((context.inOutWorkHours || 0).toFixed(2));
    timesheet.in_out_workday_count = parseFloat(((context.inOutWorkHours || 0) / standardHours).toFixed(2));

    if (context.attendanceGroupCode === ATTENDANCE_GROUPS.STORE_GROUP_1 || context.attendanceGroupCode === ATTENDANCE_GROUPS.STORE_GROUP_2) {
      if (context.totalWorkedHours > standardHours) {
        timesheet.is_redundant = true;
        timesheet.work_hours_redundant = context.totalWorkedHours - standardHours;
      } else {
        timesheet.is_redundant = false;
        timesheet.work_hours_redundant = 0;
      }
    } else {
      // Ensure redundant fields are safe for other groups
      timesheet.is_redundant = false;
      timesheet.work_hours_redundant = 0;
    }

    timesheet.rest_minutes = context['totalRestMinutesValue'] || 0;

    timesheet.missing_check_in = !!primaryPunch?.miss_check_in;
    timesheet.missing_check_out = !!primaryPunch?.miss_check_out;
    timesheet.is_late = context.totalLateMinutes > 0;
    timesheet.is_early_leave = context.totalEarlyMinutes > 0;

    timesheet.is_leave = (context.leaveHours ?? 0) > 0;
    timesheet.leave_hours = context.leaveHours ?? 0;

    timesheet.is_remote = context.onlineValue + context.businessTripValue > 0;
    // remote_hours lưu số giờ thực tế (raw hours, không nhân thêm standardHours)
    // onlineValue/businessTripValue là fraction (hours/standardHours) dùng cho workday calc
    timesheet.remote_hours = context.onlineValue + context.businessTripValue;

    timesheet.is_ot = (context.overtimeMinutes ?? 0) > 0;
    timesheet.ot_hours = (context.overtimeMinutes ?? 0) / 60;
    timesheet.adjustment_hours = context.adjustmentHours;
    const currentWorkday = context.finalActualWorkday ?? 0;

    if (currentWorkday >= 1) timesheet.attendance_status = 'Full';
    else if (currentWorkday > 0) timesheet.attendance_status = 'Partial';
    else timesheet.attendance_status = 'Lack';

    timesheet.calculation_version = 'v1.0.0';
    timesheet.calculated_at = new Date();
    timesheet.is_recalculated = true;

    this.logger.debug(
      JSON.stringify(
        {
          employee: context.employee.id,
          date: context.date,
          late: context.totalLateMinutes,
          early: context.totalEarlyMinutes,
          workHours: context.totalWorkedHours,
          inOutWorkHours: context.inOutWorkHours,
          inOutWorkdayCount: timesheet.in_out_workday_count,
        },
        null,
        2,
      ),
    );
    return await this.timesheetRepo.save(timesheet);
  }

  private combineDateAndTime(baseDate: Date, timeStr: string): Date {
    const date = new Date(baseDate); // baseDate: 2026-02-11T00:00:00.000Z
    const [hours, minutes] = timeStr.split(':').map(Number);

    date.setHours(hours, minutes, 0, 0);

    return date;
  }

  private formatDate(date: Date | string): string {
    return formatDate(new Date(date), 'yyyy-MM-dd');
  }

  private async getApplicableOverrides(
    employeeId: string,
    date: Date,
    overrideId?: string,
  ): Promise<BackdateOverride[]> {
    this.logger.debug(
      `[Override] Fetching overrides for Emp: ${employeeId}, Date: ${date.toISOString()}`,
    );

    if (overrideId) {
      this.logger.debug(`[Override] Finding specific overrideId: ${overrideId}`);
      const override = await this.overrideRepo.findOneBy({ id: overrideId });
      return override ? [override] : [];
    }

    const targetDateStr = this.formatDate(date);
    const targetDate = new Date(targetDateStr);

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['attendanceGroup', 'departments'],
    });

    if (!employee) return [];

    const assignments = await this.shiftAssignmentRepo.find({
      where: { employeeId, isActive: true },
      relations: ['shift'],
    });

    const shiftOriginIds = assignments
      .map((a) => a.shift?.originId)
      .filter((id) => !!id);

    const assignmentOriginIds = assignments
      .map((a) => a.originId)
      .filter((id) => !!id);

    const whereConditions: any[] = [
      { entity_type: 'EMPLOYEE', entity_id: employeeId, is_active: true },
    ];

    if (employee.attendanceGroup?.id) {
      whereConditions.push({
        entity_type: 'ATTENDANCE_GROUP',
        entity_id: employee.attendanceGroup.originId,
        is_active: true,
      });
    }

    if (employee.departments?.length > 0) {
      whereConditions.push({
        entity_type: 'DEPARTMENT',
        entity_id: In(employee.departments.map(d => d.id)),
        is_active: true,
      });
    }

    if (shiftOriginIds.length > 0) {
      whereConditions.push({
        entity_type: 'SHIFT',
        entity_id: In([...new Set(shiftOriginIds)]),
        is_active: true,
      });
    }

    if (assignmentOriginIds.length > 0) {
      whereConditions.push({
        entity_type: 'SHIFT_ASSIGNMENT',
        entity_id: In([...new Set(assignmentOriginIds)]),
        is_active: true,
      });
    }

    if (employee.attendanceGroup?.defaultShiftId) {
      const defaultShift = await this.shiftRepo.findOne({
        where: { id: employee.attendanceGroup.defaultShiftId }
      });
      if (defaultShift?.originId) {
        whereConditions.push({
          entity_type: 'SHIFT',
          entity_id: defaultShift.originId,
          is_active: true,
        });
      }
    }

    const allActive = await this.overrideRepo.find({
      where: whereConditions,
      order: { createdAt: 'ASC' } as any,
    });

    const filtered = allActive.filter((o) => {
      const from = new Date(this.formatDate(o.effective_from));
      const to = o.effective_to
        ? new Date(this.formatDate(o.effective_to))
        : null;

      const isMatch = targetDate >= from && (!to || targetDate <= to);
      return isMatch;
    });

    this.logger.debug(
      `[Override] DB Filter result: ${filtered.length} applicable overrides found.`,
    );
    return filtered;
  }

  private async applyOverridesToContext(
    context: CalculationContext,
    overrides: BackdateOverride[],
  ) {
    if (!overrides.length) return;

    this.logger.debug(`[Override] Applying ${overrides.length} overrides to context...`);

    for (const [index, override] of overrides.entries()) {
      if (!override.override_values) {
        this.logger.warn(`[Override] Item at index ${index} has no override_values`);
        continue;
      }
      const values = override.override_values;
      this.logger.debug(`[Override] Processing [${index}] Type: ${override.entity_type} | ID: ${override.id}`);

      switch (override.entity_type) {
        case 'SHIFT':
          if (context.shiftContext?.shift) {
            const shiftData = values.shiftContext || values;

            if (shiftData.startTime) {
              context.shiftContext.shift.startTime = this.combineDateAndTime(context.date, shiftData.startTime);
            }
            if (shiftData.endTime) {
              context.shiftContext.shift.endTime = this.combineDateAndTime(context.date, shiftData.endTime);
            }
            this.logger.debug(
              `[Override] Updated Shift properties: ${context.shiftContext.shift.startTime.toISOString()} to ${context.shiftContext.shift.endTime.toISOString()}`,
            );
          }
          break;

        case 'SHIFT_ASSIGNMENT':
          const currentAssignments = context.shiftContext?.assignments;
          if (currentAssignments && currentAssignments.length > 0) {
            const assignment = currentAssignments.find(
              (a) => a.originId === override.entity_id,
            );
            if (assignment) {
              this.logger.debug(
                `[Override] Found matching Assignment: ${assignment.originId}. Updating props...`,
              );
              if (values.onTime) {
                assignment.onTime = this.combineDateAndTime(context.date, values.onTime);
              }
              if (values.offTime) {
                assignment.offTime = this.combineDateAndTime(context.date, values.offTime);
              }
              if (values.isActive !== undefined) {
                assignment.isActive = values.isActive;
              }

              // Đổi CA gốc cho phân ca này
              if (values.shiftOriginId) {
                const newShift = await this.shiftRepo.findOne({
                  where: { originId: values.shiftOriginId },
                  relations: ['restRule'],
                });
                if (newShift) {
                  assignment.shiftId = newShift.id;
                  assignment.shift = newShift;
                  this.logger.debug(
                    `[Override] Switched ShiftAssignment ${assignment.originId} to new Shift template: ${newShift.code}`,
                  );
                }
              }

              this.logger.debug(
                `[Override] Updated Assignment ${assignment.originId}: ${assignment.onTime?.toISOString()} - ${assignment.offTime?.toISOString()} | Shift: ${assignment.shift?.code} | Active: ${assignment.isActive}`,
              );
            } else {
              this.logger.warn(
                `[Override] SHIFT_ASSIGNMENT with originId ${override.entity_id} not found in current calculation context.`,
              );
            }
          }
          break;
        case 'ATTENDANCE_GROUP':
          if (context.employee?.attendanceGroup) {
            this.logger.debug(`[Override] Overwriting Group props: ${Object.keys(values).join(', ')}`);

            // 1. Ghi đè Group (nếu truyền originId mới thì đổi group)
            if (values.attendanceGroupOriginId) {
              const newGroup = await this.attendanceGroupRepo.findOne({
                where: { originId: values.attendanceGroupOriginId },
                relations: ['defaultShift', 'defaultShift.restRule']
              });
              if (newGroup) {
                context.employee.attendanceGroup = newGroup;
                this.logger.debug(`[Override] Switched Group to: ${newGroup.groupName}`);
              }
            }

            // Ghi đè các thuộc tính cụ thể của Group hiện tại (hoặc group mới vừa set)
            Object.assign(context.employee.attendanceGroup, values);

            // 2. Ghi đè Attendance Method
            if (values.attendanceMethodOriginId) {
              const method = await this.attendanceMethodRepo.findOneBy({
                code: values.attendanceMethodOriginId,
                companyId: context.companyId,
              });
              if (method) {
                context.employee.attendanceMethod = method;
                this.logger.debug(
                  `[Override] Switched Attendance Method to: ${method.methodName}`,
                );
              }
            }

            // 3. Xử lý chuyển ca cho NHÓM
            const newShiftOriginId = values.defaultShiftOriginId || values.shiftOriginId;
            if (newShiftOriginId) {
              const newShiftContext = await this.shiftResolver.resolveShiftByOriginId(newShiftOriginId, context.date);
              if (newShiftContext) {
                context.shiftContext = newShiftContext;
                this.logger.debug(`[Override] Switched Group to new Shift: ${newShiftContext.shift?.code}`);
              }
            } else if (values.attendanceGroupOriginId && context.employee.attendanceGroup?.defaultShiftId) {
              // Nếu đổi group mà KHÔNG truyền shift mới, thì tự động lấy shift default của group mới
              const groupShiftContext = await this.shiftResolver.resolveShift(context);
              context.shiftContext = groupShiftContext;
              this.logger.debug(`[Override] Auto-switched to new Group's default Shift: ${groupShiftContext.shift?.code}`);
            }
          }
          break;
        case 'EMPLOYEE':
          if (context.employee) {
            this.logger.debug(`[Override] Overwriting Employee props: ${Object.keys(values).join(', ')}`);

            // Ghi đè các field trực tiếp của Employee
            Object.assign(context.employee, values);

            // Ghi đè Attendance Method cho nhân viên
            if (values.attendanceMethodOriginId) {
              const empMethod = await this.attendanceMethodRepo.findOneBy({
                code: values.attendanceMethodOriginId,
                companyId: context.companyId,
              });
              if (empMethod) {
                context.employee.attendanceMethod = empMethod;
                this.logger.debug(
                  `[Override] Switched Employee Attendance Method to: ${empMethod.methodName}`,
                );
              }
            }

            // Ghi đè Group cho nhân viên
            if (values.attendanceGroupOriginId) {
              const empNewGroup = await this.attendanceGroupRepo.findOne({
                where: { originId: values.attendanceGroupOriginId },
                relations: ['defaultShift', 'defaultShift.restRule']
              });
              if (empNewGroup) {
                context.employee.attendanceGroup = empNewGroup;
                this.logger.debug(`[Override] Switched Employee Group to: ${empNewGroup.groupName}`);
              }
            }

            // Xử lý chuyển ca cho NHÂN VIÊN
            const empShiftOriginId = values.shiftOriginId || values.defaultShiftOriginId;
            if (empShiftOriginId) {
              const empNewShiftContext = await this.shiftResolver.resolveShiftByOriginId(empShiftOriginId, context.date);
              if (empNewShiftContext) {
                context.shiftContext = empNewShiftContext;
                this.logger.debug(`[Override] Switched Employee to new Shift: ${empNewShiftContext.shift?.code}`);
              }
            } else if (values.attendanceGroupOriginId && context.employee.attendanceGroup?.defaultShiftId) {
              // Nếu đổi group mà ko truyền shift, lấy default shift của group mới
              const empGroupShiftContext = await this.shiftResolver.resolveShift(context);
              context.shiftContext = empGroupShiftContext;
              this.logger.debug(`[Override] Employee auto-switched to new Group's default Shift: ${empGroupShiftContext.shift?.code}`);
            }
          }
          break;
        case 'DEPARTMENT':
          if (context.employee?.departments) {
            this.logger.debug(
              `[Override] Overwriting Department props: ${Object.keys(values).join(', ')}`,
            );

            // Ghi đè Attendance Method cho phòng ban
            if (values.attendanceMethodOriginId) {
              const deptMethod = await this.attendanceMethodRepo.findOneBy({
                code: values.attendanceMethodOriginId,
                companyId: context.companyId,
              });
              if (deptMethod) {
                context.employee.attendanceMethod = deptMethod;
                this.logger.debug(
                  `[Override] Switched Dept Attendance Method to: ${deptMethod.methodName}`,
                );
              }
            }
          }
          break;

        default:
          this.logger.debug(`[Override] Unknown entity_type: ${override.entity_type}`);
      }
    }
    this.logger.debug(`[Override] Application completed.`);
  }
}

