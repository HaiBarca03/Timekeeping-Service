import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class WorkdayCalculationStrategy {
  private readonly logger = new Logger(WorkdayCalculationStrategy.name);

  process(context: CalculationContext): void {
    this.logger.debug(
      `[DEBUG] Effective AllowLate from Context: ${context['allowLateMinutes']}`,
    );
    this.logger.debug(
      `[DEBUG] AllowLate from Shift Rule: ${context.shiftContext?.rule?.allowLateMinutes}`,
    );
    // 1. XỬ LÝ NGÀY NGHỈ CHẾ ĐỘ (OFF DAY / HOLIDAY)
    if (context.isConfiguredOffDay || context.isHoliday) {
      context.totalWorkedHours = 0;
      // Nếu là lễ, finalActualWorkday đã được set = 1.0 ở Resolver,
      // nếu là ngày nghỉ bình thường (Chủ nhật/T7) thì = 0.
      context.finalActualWorkday = context.finalTotalWorkday || 0;

      context.totalLateMinutes = 0;
      context.totalEarlyMinutes = 0;

      this.logger.debug(
        `OffDay/Holiday Detected: Workday = ${context.finalActualWorkday}`,
      );
      return;
    }

    let totalMinutes = 0;
    const groupCode = context.employee.attendanceGroup?.code;
    const isMaternity = !!context.employee['is_maternity_shift'];
    const isFactoryGroup =
      groupCode === 'FACTORY_GROUP' ||
      context.attendanceGroupName === 'Nhóm Khối Xưởng';

    const standardHours = context.shiftContext
      ? context.shiftContext.getStandardWorkHours(isMaternity, groupCode)
      : 8;

    this.logger.debug(
      `[Calc] Standard Hours: ${standardHours}h (Group: ${groupCode})`,
    );

    // 2. TÍNH TOÁN GIỜ LÀM TỪ PUNCH
    // Tìm trong file WorkdayCalculationStrategy.ts
    // Tìm đoạn này trong WorkdayCalculationStrategy.ts và sửa lại như sau:

    let totalDiffMinutes = 0;

    for (const punch of context.punches) {
      const inTime = punch.check_in_actual || punch.check_in_time;
      const outTime = punch.check_out_actual || punch.check_out_time;

      if (inTime && outTime) {
        // KIỂM TRA VI PHẠM: Miss check hoặc Invalid là HỦY CA ĐÓ (0 phút)
        if (
          punch.miss_check_in ||
          punch.miss_check_out ||
          punch['is_invalid_workday']
        ) {
          this.logger.warn(
            `Punch rejected: Violation detected for ca starting at ${inTime}`,
          );
          continue; // Bỏ qua ca này, không cộng vào tổng
        }

        // Tính số phút của ca này
        const diff =
          (new Date(outTime).getTime() - new Date(inTime).getTime()) / 60000;
        totalDiffMinutes += Math.max(0, diff);
      }
    }

    // 3. TRỪ GIỜ NGHỈ (CHỈ TRỪ 1 LẦN DUY NHẤT SAU VÒNG LẶP)
    let finalMinutes = totalDiffMinutes;
    if (!isFactoryGroup) {
      const totalRest = context['totalRestMinutesValue'] || 0;
      finalMinutes = Math.max(0, totalDiffMinutes - totalRest);
    } else {
      // Logic riêng cho Factory (như cũ của bạn)
      if (finalMinutes > 240) finalMinutes -= 60;
    }

    let finalHours = finalMinutes / 60;

    // Lưu giờ thực tế chỉ từ in/out trừ rest
    context.inOutWorkHours = finalHours;

    // Cộng thêm Remote/Công tác
    if (context.onlineValue > 0 || context.businessTripValue > 0) {
      finalHours += context.onlineValue + context.businessTripValue;
    }

    context.totalWorkedHours = finalHours;

    // 4. QUY ĐỔI RA CÔNG (WORKDAY)
    // Ví dụ: Làm được 3h / Tổng chuẩn 4h = 0.75 công
    let workedWorkday = context.totalWorkedHours / standardHours;
    if (workedWorkday > 1) workedWorkday = 1;

    const leaveContribution = context.leaveValue || 0;
    let totalFinalWorkday = workedWorkday + leaveContribution;

    // Trừ phạt (Penalty)
    const totalPenalty =
      (context.latePenalty || 0) + (context.earlyPenalty || 0);
    totalFinalWorkday = Math.max(0, totalFinalWorkday - totalPenalty);

    context.finalActualWorkday = totalFinalWorkday > 1 ? 1 : totalFinalWorkday;

    this.logger.debug(
      `FINAL: Worked=${context.totalWorkedHours}h / Std=${standardHours}h -> Workday=${context.finalActualWorkday}`,
    );
  }
}
