import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class WorkdayCalculationStrategy {
  private readonly logger = new Logger(WorkdayCalculationStrategy.name);

  process(context: CalculationContext): void {
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
      : isMaternity && groupCode === 'STORE_GROUP'
        ? 7
        : 8;
    this.logger.debug(
      `[Calc] Standard Hours: ${standardHours}h (Group: ${groupCode})`,
    );
    // 2. TÍNH TOÁN GIỜ LÀM TỪ PUNCH
    // Tìm trong file WorkdayCalculationStrategy.ts
    // Tìm đoạn này trong WorkdayCalculationStrategy.ts và sửa lại như sau:

    for (const punch of context.punches) {
      const inTime = punch.check_in_actual || punch.check_in_time;
      const outTime = punch.check_out_actual || punch.check_out_time;

      if (!isFactoryGroup) {
        if (
          punch.miss_check_in ||
          punch.miss_check_out ||
          punch['is_invalid_workday']
        ) {
          this.logger.warn(
            `Punch rejected for Office/Store: Violation detected, 0 hours assigned.`,
          );
          // KHÔNG dùng continue ở đây nữa.
          // Ta chỉ ghi log và không thực hiện tính toán diff bên dưới cho punch này.
        } else {
          // Chỉ tính toán khi KHÔNG vi phạm
          if (inTime && outTime) {
            let diff =
              (new Date(outTime).getTime() - new Date(inTime).getTime()) /
              60000;
            const deductedRest = context['totalRestMinutesValue'] || 0;
            diff -= deductedRest;
            totalMinutes += Math.max(0, diff);
          }
        }
      } else {
        // Logic cho Factory Group (như cũ)
        if (inTime && outTime) {
          let diff =
            (new Date(outTime).getTime() - new Date(inTime).getTime()) / 60000;
          const restMinutes = 60;
          if (diff > 240) diff -= restMinutes;
          totalMinutes += Math.max(0, diff);
        }
      }
    }

    let finalHours = totalMinutes / 60;

    // Cộng thêm giờ Remote/Công tác (đơn vị: giờ)
    if (context.onlineValue > 0 || context.businessTripValue > 0) {
      finalHours += context.onlineValue + context.businessTripValue;
    }

    // 3. LOGIC KHỐI XƯỞNG: Làm đủ 8h tính 1 công, làm thiếu tính thực tế
    if (isFactoryGroup) {
      if (finalHours >= 8) finalHours = 8;
    }

    context.totalWorkedHours = finalHours;

    // 4. QUY ĐỔI RA CÔNG (WORKDAY)
    // Công đi làm thực tế
    let workedWorkday = context.totalWorkedHours / standardHours;
    if (workedWorkday > 1) workedWorkday = 1;

    /**
     * NGHIỆP VỤ QUAN TRỌNG: TỔNG HỢP CÔNG
     * finalActualWorkday = Công đi làm + Công nghỉ phép (leaveValue từ LeaveStrategy)
     */
    const leaveContribution = context.leaveValue || 0;
    let totalFinalWorkday = workedWorkday + leaveContribution;

    // Trừ các loại phạt (Penalty) nếu có quy định trừ trực tiếp vào công
    const totalPenalty =
      (context.latePenalty || 0) + (context.earlyPenalty || 0);
    totalFinalWorkday = Math.max(0, totalFinalWorkday - totalPenalty);

    // Giới hạn tối đa 1 công trong ngày thường
    context.finalActualWorkday = totalFinalWorkday > 1 ? 1 : totalFinalWorkday;

    this.logger.debug(
      `FINAL CALC: WorkedHours=${context.totalWorkedHours}h -> Workday=${workedWorkday} | ` +
        `LeaveValue=${leaveContribution} | FinalWorkday=${context.finalActualWorkday}`,
    );
  }
}
