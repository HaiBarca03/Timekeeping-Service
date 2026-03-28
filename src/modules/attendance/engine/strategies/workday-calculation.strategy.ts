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
    let inOutWorkMinutes = 0;

    const parseShiftTimeToDate = (baseDate: Date, timeInput: any): Date | null => {
      if (!timeInput) return null;
      const result = new Date(baseDate);
      if (typeof timeInput === 'string') {
        const parts = timeInput.split(':');
        result.setHours(Number(parts[0]), Number(parts[1] || 0), 0, 0);
      } else if (timeInput instanceof Date) {
        result.setHours(timeInput.getHours(), timeInput.getMinutes(), 0, 0);
      } else {
        return null;
      }
      return result;
    };

    const shiftRule = context.shiftContext?.rule;
    const restRule = context.shiftContext?.restRule;

    let shiftStart: Date | null = null;
    let shiftEnd: Date | null = null;
    if (shiftRule && shiftRule.onTime && shiftRule.offTime) {
      shiftStart = parseShiftTimeToDate(context.date, shiftRule.onTime);
      shiftEnd = parseShiftTimeToDate(context.date, shiftRule.offTime);
      if (shiftStart && shiftEnd && shiftEnd < shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }
    }

    let restStart: Date | null = null;
    let restEnd: Date | null = null;
    if (restRule && restRule.restBeginTime && restRule.restEndTime) {
      restStart = parseShiftTimeToDate(context.date, restRule.restBeginTime);
      restEnd = parseShiftTimeToDate(context.date, restRule.restEndTime);
      if (restStart && restEnd && restEnd < restStart) {
        restEnd.setDate(restEnd.getDate() + 1);
      }
    }

    for (const punch of context.punches) {
      const inTime = punch.check_in_actual || punch.check_in_time;
      const outTime = punch.check_out_actual || punch.check_out_time;

      if (inTime && outTime) {
        // Tính số phút in_out_work_hours (bị giới hạn bởi ca làm việc) - PHẢI ĐẶT TRƯỚC LÚC REJECT CA
        if (shiftStart && shiftEnd) {
          const actualIn = new Date(inTime);
          const actualOut = new Date(outTime);

          const effectiveIn = actualIn < shiftStart ? shiftStart : actualIn;
          const effectiveOut = actualOut > shiftEnd ? shiftEnd : actualOut;

          if (effectiveOut > effectiveIn) {
            let cappedDiff =
              (effectiveOut.getTime() - effectiveIn.getTime()) / 60000;

            // Tính thời gian nghỉ (overlapping với thời gian làm việc hiệu dụng)
            if (restStart && restEnd) {
              const overlapStart =
                effectiveIn > restStart ? effectiveIn : restStart;
              const overlapEnd =
                effectiveOut < restEnd ? effectiveOut : restEnd;
              if (overlapEnd > overlapStart) {
                const restOverlapMin =
                  (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
                cappedDiff -= restOverlapMin;
              }
            }

            inOutWorkMinutes += Math.max(0, cappedDiff);
          }
        }

        // KIỂM TRA VI PHẠM: Miss check hoặc Invalid là HỦY CA ĐÓ (0 phút đối với công chuẩn)
        if (
          punch.miss_check_in ||
          punch.miss_check_out ||
          punch['is_invalid_workday']
        ) {
          this.logger.warn(
            `Punch rejected: Violation detected for ca starting at ${inTime}`,
          );
          continue; // Bỏ qua ca này, không cộng vào tổng công chuẩn
        }

        // Tính số phút của ca này cho tổng thời gian lam viec chuẩn (như cũ)
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

    // Lưu giờ thực tế chỉ từ in/out trừ rest: Nếu có ca làm việc thì lấy giờ đã giới hạn
    context.inOutWorkHours =
      shiftStart && shiftEnd ? inOutWorkMinutes / 60 : finalHours;

    // Cộng thêm Remote/Công tác
    if (context.onlineValue > 0 || context.businessTripValue > 0) {
      finalHours += context.onlineValue + context.businessTripValue;
    }

    context.totalWorkedHours = finalHours;

    // 4. QUY ĐỔI RA CÔNG (WORKDAY)
    // Nếu đã có CORRECTION được duyệt → giữ nguyên finalActualWorkday = 1 từ CorrectionStrategy
    if (context['isManualCorrected']) {
      this.logger.debug(
        `[WorkdayCalc] isManualCorrected=true: keeping finalActualWorkday=${context.finalActualWorkday}, totalWorkedHours=${finalHours}`,
      );
      return;
    }

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
