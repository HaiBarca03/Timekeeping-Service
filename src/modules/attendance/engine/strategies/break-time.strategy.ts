// import { Injectable } from '@nestjs/common';
// import { CalculationContext } from '../dto/calculation-context.dto';
// import { differenceInMinutes } from 'date-fns';

// @Injectable()
// export class BreakTimeStrategy {
//   /**
//    * Xử lý trừ break cho toàn bộ ngày
//    */
//   process(context: CalculationContext): void {
//     // Trường hợp không cần tính break phức tạp
//     if (!context.shiftContext?.restRules?.length || context.punches.length === 0) {
//       // Không có rule nghỉ hoặc không có punch → tính giờ thô
//       context.totalWorkedHours = this.calculateRawWorkedHours(context);
//       return;
//     }

//     let totalWorkedMinutes = 0;
//     // === LẤY GIỜ CA MỘT LẦN ===
//     const shiftStart = this.combineDateAndTime(
//       context.date,
//       context.shiftContext.rule?.onTime!,
//     );

//     const shiftEnd = this.combineDateAndTime(
//       context.date,
//       context.shiftContext.rule?.offTime!,
//     );
//     // Duyệt từng cặp punch (mỗi cặp là một segment làm việc)
//     for (const punch of context.punches) {
//       // Bỏ qua nếu thiếu check-in hoặc check-out
//       if (!punch.check_in_time || !punch.check_out_time) continue;

//     // Clamp
//     let segmentStart =
//       punch.check_in_time < shiftStart
//         ? shiftStart
//         : punch.check_in_time;

//     let segmentEnd =
//       punch.check_out_time > shiftEnd
//         ? shiftEnd
//         : punch.check_out_time;

//     // Nếu sau clamp mà ngược giờ → bỏ
//     if (segmentEnd <= segmentStart) continue;

//     let segmentMinutes = differenceInMinutes(segmentEnd, segmentStart);

//       // Trừ overlap với từng khoảng nghỉ (rest rule)
//       for (const rest of context.shiftContext.restRules) {
//         if (!rest.restBeginTime || !rest.restEndTime) continue;

//         // Ghép giờ nghỉ thành datetime đầy đủ (cùng ngày với context.date)
//         const restStart = this.combineDateAndTime(context.date, rest.restBeginTime);
//         const restEnd = this.combineDateAndTime(context.date, rest.restEndTime);

//         // Tính phần giao nhau (overlap)
//         const overlapStart = new Date(Math.max(segmentStart.getTime(), restStart.getTime()));
//         const overlapEnd = new Date(Math.min(segmentEnd.getTime(), restEnd.getTime()));

//         // Nếu có overlap (overlapStart < overlapEnd)
//         if (overlapStart < overlapEnd) {
//           const overlapMin = differenceInMinutes(overlapEnd, overlapStart);
//           segmentMinutes -= overlapMin; // Trừ thời gian nghỉ ra khỏi segment
//         }
//       }

//       // Đảm bảo không âm
//       totalWorkedMinutes += Math.max(0, segmentMinutes);
//     }

//     const standardMinutes =
//       differenceInMinutes(shiftEnd, shiftStart) -
//       context.shiftContext.restRules.reduce((sum, r) => {
//         const rs = this.combineDateAndTime(context.date, r.restBeginTime!);
//         const re = this.combineDateAndTime(context.date, r.restEndTime!);
//         return sum + differenceInMinutes(re, rs);
//       }, 0);

//     // Cap max
//     // totalWorkedMinutes = Math.min(totalWorkedMinutes, standardMinutes);

//     // Chuyển sang giờ
//     context.totalWorkedHours = totalWorkedMinutes / 60;

//     // Trường hợp toàn bộ bị trừ hết hoặc không có segment hợp lệ
//     if (totalWorkedMinutes <= 0) {
//       context.totalWorkedHours = 0;
//     }
//   }

//   /**
//    * Tính giờ thô (không trừ break) - dùng khi skip break
//    */
//   private calculateRawWorkedHours(context: CalculationContext): number {
//     let minutes = 0;
//     for (const punch of context.punches) {
//       if (punch.check_in_time && punch.check_out_time) {
//         minutes += differenceInMinutes(punch.check_out_time, punch.check_in_time);
//       }
//     }
//     return minutes / 60;
//   }

//   /**
//    * Ghép ngày + giờ string thành Date object
//    * Ví dụ: date = 2025-10-01, timeStr = "12:00" → 2025-10-01 12:00:00
//    */
//   private combineDateAndTime(date: Date, timeStr: string): Date {
//     const [h, m] = timeStr.split(':').map(Number);
//     const dt = new Date(date);
//     dt.setHours(h, m, 0, 0);
//     return dt;
//   }
// }