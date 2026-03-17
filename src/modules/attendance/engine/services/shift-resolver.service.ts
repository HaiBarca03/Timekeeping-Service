import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Raw, Repository } from 'typeorm';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { ShiftContext } from '../dto/shift-context.dto';
import { CalculationContext } from '../dto/calculation-context.dto';
import { ShiftAssignment } from '../../entities/shift-assignment.entity';
import { AttendanceDailyTimesheet } from '../../entities/attendance-daily-timesheet.entity';
import { Holiday } from '../../entities/holidays.entity';

@Injectable()
export class ShiftResolverService {
  private readonly logger = new Logger(ShiftResolverService.name);
  constructor(
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(ShiftAssignment)
    private shiftAssignmentRepo: Repository<ShiftAssignment>,

    @InjectRepository(Holiday)
    private holidayRepo: Repository<Holiday>,
  ) {}

  async resolveShift(context: CalculationContext): Promise<ShiftContext> {
    const { employee, date } = context;
    const groupCode = employee.attendanceGroup?.code;
    const dayOfWeek = date.getDay();

    const isStoreGroup = groupCode === 'STORE_GROUP';
    const isOfficeGroup = !isStoreGroup && groupCode !== 'FACTORY_GROUP';
    const hasPunches = context.punches?.length > 0;

    const holiday = await this.holidayRepo.findOne({
      where: { holiday_date: context.date, is_active: true },
    });

    if (holiday) {
      // CASE 2: CHECK THAI SẢN (Hoặc các loại nghỉ dài hạn không hưởng lễ)
      // context.leaveHours > 0 và loại phép là thai sản (mã 'TS' hoặc tương tự)
      const isMaternity =
        context.leaveHours > 0 && context['leaveTypeCode'] === 'MATERNITY';

      if (isMaternity) {
        this.logger.debug(`Đang nghỉ thai sản -> Không hưởng công lễ.`);
        // Trôi xuống logic bình thường của ngày nghỉ phép
      } else {
        // KIỂM TRA QUYỀN HƯỞNG LỄ (PUBLIC cho tất cả, ANGEL chỉ cho Angel)
        const isEnjoyable =
          holiday.holiday_type === 'PUBLIC' ||
          (holiday.holiday_type === 'ANGEL' && employee.is_angel);

        if (isEnjoyable) {
          // CASE 1: TRÙNG NGÀY NGHỈ (KHÔNG GÁN CA)
          // Với Store: Phải có bản ghi trong ShiftAssignment
          // Với Office: Thường là ngày làm việc (Thứ 2 - Thứ 6 hoặc T7 có lịch)
          const hasAssignment = await this.checkHasAssignment(context);

          if (hasAssignment) {
            context.isHoliday = true;
            context.isConfiguredOffDay = true; // Đánh dấu nghỉ hưởng lễ
            context.finalTotalWorkday = 1.0; // Được hưởng 1 công lễ
            return new ShiftContext(); // Nghỉ lễ không cần gán ca làm việc
          } else {
            this.logger.debug(
              `Lễ trùng ngày nghỉ/ngày không gán ca -> Không hưởng công lễ.`,
            );
          }
        }
      }
    }

    // 1. CHỦ NHẬT: Văn phòng nghỉ, Cửa hàng làm
    if (dayOfWeek === 0 && isOfficeGroup) {
      return this.markAsConfiguredOff(context);
    }

    // 2. NHÓM ANGEL (Cửa hàng): Nghỉ 4 ngày bất kỳ
    if (isStoreGroup && employee.is_angel && !hasPunches) {
      const offCount = await this.countConfiguredOffDays(employee.id, date);
      if (offCount < 4) {
        this.logger.debug(`Angel Off: ${offCount + 1}/4`);
        return this.markAsConfiguredOff(context);
      }
    }

    // 3. VĂN PHÒNG: Nghỉ 2 Thứ 7 bất kỳ
    // note: nếu làm 4 t7, lấy ra 2 ngày tốt nhất
    if (dayOfWeek === 6 && isOfficeGroup && employee.is_saturday_off) {
      this.logger.debug(
        `Thứ 7 Office -> Đánh dấu Candidate để hậu xử lý tối ưu`,
      );
      // if (!hasPunches) {
      //   // Nếu KHÔNG ĐI LÀM: Kiểm tra xem đã dùng hết hạn mức nghỉ chưa
      //   const totalSaturdays = this.getTotalSaturdaysInMonth(date);
      //   const maxOffDays = totalSaturdays === 5 ? 3 : 2; // 5 Thứ 7 nghỉ 3, 4 Thứ 7 nghỉ 2

      //   // đếm xem dã làm mấy t7
      //   const offCount = await this.countConfiguredOffDays(employee.id, date);

      //   if (offCount < maxOffDays) {
      //     this.logger.debug(
      //       `Thứ 7 nghỉ chế độ (Không đi làm): ${offCount + 1}/${maxOffDays}`,
      //     );
      //     return this.markAsConfiguredOff(context);
      //   }
      // } else {
      // }
      context.isSaturdayCandidate = true;
      context['isSaturdayCandidate'] = true;
      return this.resolveOfficeShift(context);
    }

    // 4. LẤY CA LÀM VIỆC BÌNH THƯỜNG
    context.isConfiguredOffDay = false;
    return isStoreGroup
      ? this.resolveStoreShifts(context)
      : this.resolveOfficeShift(context);
  }

  private markAsConfiguredOff(context: CalculationContext): ShiftContext {
    context.isConfiguredOffDay = true;
    context.finalTotalWorkday = 0;
    return new ShiftContext();
  }

  private async countConfiguredOffDays(
    employeeId: string,
    date: Date,
  ): Promise<number> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const calculationDateStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    return await this.timesheetRepo.count({
      where: {
        employee_id: employeeId,
        attendance_date: Between(
          startOfMonth,
          Raw((alias) => `${alias} < :target`, {
            target: calculationDateStart.toISOString(),
          }),
        ),
        is_configured_off_day: true,
      },
    });
  }

  private async resolveOfficeShift(context: CalculationContext) {
    let shift: Shift | null = null;

    if (context.employee.attendanceGroup?.defaultShiftId) {
      shift = await this.shiftRepo.findOne({
        where: { id: context.employee.attendanceGroup.defaultShiftId },
        relations: ['restRules'],
      });
    }

    if (!shift) {
      throw new Error(
        `No shift found for employee ${context.employee.id} on ${context.date}`,
      );
    }

    return new ShiftContext(shift);
  }

  private async resolveStoreShifts(
    context: CalculationContext,
  ): Promise<ShiftContext> {
    const assignments = await this.shiftAssignmentRepo.find({
      where: {
        employeeId: context.employee.id,
        date: context.date,
        isActive: true,
      },
      relations: ['shift', 'shift.restRules'],
    });

    if (assignments.length === 0) {
      throw new Error(`No shift assignments for store employee`);
    }

    const shift = assignments[0].shift;

    return new ShiftContext(shift, assignments);
  }

  private async checkHasAssignment(
    context: CalculationContext,
  ): Promise<boolean> {
    const { employee, date } = context;
    const groupCode = employee.attendanceGroup?.code;

    // Nếu là khối Cửa hàng: Bắt buộc phải có ShiftAssignment hoạt động
    if (groupCode === 'STORE_GROUP') {
      const assignment = await this.shiftAssignmentRepo.findOne({
        where: { employeeId: employee.id, date: date, isActive: true },
      });
      return !!assignment;
    }

    // Nếu là khối Văn phòng:
    // Thường mặc định Thứ 2 - Thứ 6 là có ca. Thứ 7/CN thì check isConfiguredOffDay sau.
    // Ở đây ta trả về true để họ được hưởng lễ nếu rơi vào ngày thường.
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0; // Nếu lễ rơi vào Chủ Nhật văn phòng (không gán ca) -> false
  }
}
