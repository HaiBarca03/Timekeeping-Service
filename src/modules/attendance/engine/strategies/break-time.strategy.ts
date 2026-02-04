import { Injectable } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class BreakTimeStrategy {
  /**
   * Xử lý trừ break cho toàn bộ ngày
   */
  process(context: CalculationContext): void {
    // Trường hợp không cần tính break phức tạp
    if (!context.shiftContext?.restRules?.length || context.punches.length === 0) {
      // Không có rule nghỉ hoặc không có punch → tính giờ thô
      context.totalWorkedHours = this.calculateRawWorkedHours(context);
      return;
    }

    let totalWorkedMinutes = 0;

    // Duyệt từng cặp punch (mỗi cặp là một segment làm việc)
    for (const punch of context.punches) {
      // Bỏ qua nếu thiếu check-in hoặc check-out
      if (!punch.check_in_time || !punch.check_out_time) continue;

      let segmentStart = punch.check_in_time;
      let segmentEnd = punch.check_out_time;
      let segmentMinutes = differenceInMinutes(segmentEnd, segmentStart);

      // Trừ overlap với từng khoảng nghỉ (rest rule)
      for (const rest of context.shiftContext.restRules) {
        if (!rest.restBeginTime || !rest.restEndTime) continue;

        // Ghép giờ nghỉ thành datetime đầy đủ (cùng ngày với context.date)
        const restStart = this.combineDateAndTime(context.date, rest.restBeginTime);
        const restEnd = this.combineDateAndTime(context.date, rest.restEndTime);

        // Tính phần giao nhau (overlap)
        const overlapStart = new Date(Math.max(segmentStart.getTime(), restStart.getTime()));
        const overlapEnd = new Date(Math.min(segmentEnd.getTime(), restEnd.getTime()));

        // Nếu có overlap (overlapStart < overlapEnd)
        if (overlapStart < overlapEnd) {
          const overlapMin = differenceInMinutes(overlapEnd, overlapStart);
          segmentMinutes -= overlapMin; // Trừ thời gian nghỉ ra khỏi segment
        }
      }

      // Đảm bảo không âm
      totalWorkedMinutes += Math.max(0, segmentMinutes);
    }

    // Chuyển sang giờ
    context.totalWorkedHours = totalWorkedMinutes / 60;

    // Trường hợp toàn bộ bị trừ hết hoặc không có segment hợp lệ
    if (totalWorkedMinutes <= 0) {
      context.totalWorkedHours = 0;
    }
  }

  /**
   * Tính giờ thô (không trừ break) - dùng khi skip break
   */
  private calculateRawWorkedHours(context: CalculationContext): number {
    let minutes = 0;
    for (const punch of context.punches) {
      if (punch.check_in_time && punch.check_out_time) {
        minutes += differenceInMinutes(punch.check_out_time, punch.check_in_time);
      }
    }
    return minutes / 60;
  }

  /**
   * Ghép ngày + giờ string thành Date object
   * Ví dụ: date = 2025-10-01, timeStr = "12:00" → 2025-10-01 12:00:00
   */
  private combineDateAndTime(date: Date, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    return dt;
  }
}

/**
 * BreakTimeStrategy
 * 
 * Mục đích: Trừ thời gian nghỉ giữa ca (break/rest) ra khỏi tổng thời gian làm việc thực tế.
 *           Kết quả là context.totalWorkedHours sẽ chứa số giờ làm việc hiệu quả (sau khi trừ break).
 * 
 * Input (qua context):
 *   - context.punches: Mảng các cặp check-in/check-out (từ PunchProcessingStrategy)
 *   - context.shiftContext.restRules: Mảng các khoảng nghỉ (restBeginTime, restEndTime)
 *   - context.date: Ngày tính công (dùng để ghép giờ nghỉ thành datetime đầy đủ)
 * 
 * Output: Không return gì (void), chỉ cập nhật context.totalWorkedHours
 * 
 * Ví dụ minh họa (ca hành chính 8:00-12:00 & 13:00-17:00):
 * 
 * 1. Nhân viên đúng giờ full ca
 *    - Punch: check_in 08:00 → check_out 17:00
 *    - Rest rule: 12:00 - 13:00 (60 phút)
 *    → Tổng giờ thô: 9 giờ (540 phút)
 *    → Trừ overlap 60 phút → totalWorkedHours = 8 giờ (đúng chuẩn 1 ngày công)
 * 
 * 2. Nhân viên vào muộn, ra sớm
 *    - Punch: 08:30 → 16:30 (8 giờ thô)
 *    → Trừ overlap 60 phút (12:00-13:00) → totalWorkedHours = 7 giờ
 * 
 * 3. Có nhiều cặp punch (ra ngoài ăn trưa riêng)
 *    - Cặp 1: 08:00 - 11:45
 *    - Cặp 2: 13:15 - 17:00
 *    → Segment 1 không overlap rest → giữ 225 phút
 *    → Segment 2 không overlap rest → giữ 225 phút
 *    → totalWorkedHours = 7.5 giờ (không trừ thêm vì không làm trong giờ nghỉ)
 * 
 * 4. Miss check-out hoặc miss check-in
 *    - Segment thiếu in/out → bị bỏ qua (continue)
 *    → Nếu toàn bộ miss → totalWorkedHours = 0
 * 
 * Logic chính: Chỉ trừ phần thời gian overlap thực tế giữa segment làm việc và khoảng nghỉ.
 *              Không trừ nếu segment nằm hoàn toàn trước/sau giờ nghỉ.
 */