import { Injectable } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class WorkdayCalculationStrategy {
  process(context: CalculationContext): void {
    const standardHours = context.shiftContext?.getStandardWorkHours() || 8;

    // 1. Tính công thô từ giờ làm việc hiệu quả
    let actualWorkday = context.totalWorkedHours / standardHours;

    // 2. Trừ các khoản phạt
    const totalPenalty = (context.latePenalty || 0) + 
                         (context.earlyPenalty || 0) + 
                         (context.missPenalty || 0);
    
    actualWorkday = actualWorkday - totalPenalty;

    // 3. GIỚI HẠN CÔNG TỐI ĐA LÀ 1
    // Nếu không có Tăng ca (OT) trả bằng công/lương, thì tối đa chỉ nhận 1.0 công
    // Chúng ta tính toán phần công tăng ca riêng (nếu overtimeMinutes > 0)
    const otWorkday = context.overtimeMinutes > 0 ? (context.overtimeMinutes / 60) / standardHours : 0;
    
    if (otWorkday > 0) {
      // Nếu có OT: Công = (Tối đa 1 công ngày thường) + Công OT
      actualWorkday = Math.min(actualWorkday - otWorkday, 1) + otWorkday;
    } else {
      // Không có OT: Chốt cứng không quá 1 công
      actualWorkday = Math.min(actualWorkday, 1);
    }

    // 4. Ưu tiên Remote/Công tác
    if (context.onlineValue > 0 || context.businessTripValue > 0) {
      actualWorkday = Math.max(actualWorkday, context.onlineValue + context.businessTripValue);
    }

    // Đảm bảo không âm và gán kết quả
    context.finalActualWorkday = Math.max(0, actualWorkday);
    context.finalTotalWorkday = 1; 
  }
}

/**
 * WorkdayCalculationStrategy
 * 
 * Mục đích: 
 *   - Đây là strategy **cuối cùng** trong chain tính công ngày
 *   - Tổng hợp tất cả dữ liệu từ các strategy trước (punches, break, late/early, OT, remote/online)
 *   - Tính ra **actual_workday** (số ngày công thực tế, thường 0-2, ví dụ 1 = full ngày, 0.5 = half day, 1.5 = OT thêm)
 *   - Set finalTotalWorkday (thường 1 cho ngày làm việc chuẩn)
 *   - Chuẩn bị dữ liệu để save vào AttendanceDailyTimesheet
 * 
 * Input (qua context):
 *   - context.totalWorkedHours: Giờ làm việc hiệu quả sau trừ break (từ BreakTimeStrategy)
 *   - context.latePenalty, context.earlyPenalty, context.missPenalty: Phạt trừ công (từ LateEarlyStrategy)
 *   - context.overtimeMinutes: Phút OT trả lương (từ OvertimeStrategy)
 *   - context.onlineValue, context.businessTripValue: Giá trị online/công tác (từ RemoteWorkStrategy)
 *   - context.shiftContext.getStandardWorkHours(): Giờ chuẩn của ca (thường 8h)
 * 
 * Output: Không return gì (void), chỉ cập nhật context:
 *   - context.finalActualWorkday: Số ngày công thực tế cuối cùng (sẽ save vào timesheet.actual_workday)
 *   - context.finalTotalWorkday: Số ngày công chuẩn (thường 1, save vào timesheet.total_workday)
 * 
 * Ví dụ minh họa (ca chuẩn 8h):
 * 
 * 1. Trường hợp bình thường, đúng giờ, không OT/remote
 *    - totalWorkedHours = 8
 *    - latePenalty = 0, earlyPenalty = 0, missPenalty = 0
 *    - overtimeMinutes = 0
 *    - onlineValue = 0, businessTripValue = 0
 *    → actualWorkday = 8 / 8 = 1
 *    → trừ phạt = 0 → finalActualWorkday = 1.0
 * 
 * 2. Trễ nặng (latePenalty = 0.5), OT 120 phút (multiplier 1.5 → effective 180 phút = 3 giờ)
 *    - totalWorkedHours = 8
 *    - actualWorkday = 8/8 = 1
 *    - trừ latePenalty = 0.5 → 0.5
 *    - cộng OT: 3 / 8 = 0.375 → 0.5 + 0.375 = 0.875
 *    → finalActualWorkday ≈ 0.875
 * 
 * 3. Remote/online full ngày (onlineValue = 1.0), miss toàn bộ punch
 *    - totalWorkedHours = 0 (miss)
 *    - missPenalty = 0 (do RemoteStrategy đã set)
 *    - actualWorkday = 0 / 8 = 0
 *    - onlineValue = 1.0 → Math.max(0, 1.0) = 1.0
 *    → finalActualWorkday = 1.0 (coi như full ngày công dù miss punch)
 * 
 * 4. Công tác + OT trả lương
 *    - businessTripValue = 1.0
 *    - overtimeMinutes = 240 phút (4 giờ)
 *    → actualWorkday = ... + 4/8 = 0.5
 *    → Math.max(..., 1.0 + 0.5) → ưu tiên ít nhất 1.0 (công tác full)
 * 
 * Logic chính:
 *   1. Tính công từ giờ làm hiệu quả (sau trừ break)
 *   2. Trừ phạt (trễ/sớm/miss)
 *   3. Cộng OT trả lương (chỉ phần overtimeMinutes, không cộng compensatory)
 *   4. Nếu có online/công tác → ưu tiên giá trị đó (ít nhất bằng 1.0 nếu full day)
 *   5. Giới hạn giá trị hợp lý (0 đến 2, tránh âm hoặc vô lý)
 * 
 * Lưu ý:
 *   - Giới hạn max 2 là ví dụ (có thể chỉnh thành 1.5 nếu OT max 50%)
 *   - finalTotalWorkday = 1 mặc định → có thể chỉnh nếu ngày lễ/half day (sau này thêm HolidayStrategy)
 *   - Phần comment // Optional: set ... → nên mở ra để map trực tiếp vào entity trước khi save
 */