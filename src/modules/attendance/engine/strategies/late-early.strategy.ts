import { Injectable } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';
import { CalculationContext } from '../dto/calculation-context.dto';
import { RuleFactoryService } from '../services/rule-factory.service';

@Injectable()
export class LateEarlyStrategy {
  constructor(private ruleFactory: RuleFactoryService) {}

  process(context: CalculationContext): void {
    if (!context.shiftContext?.rule) return;

    const rule = this.ruleFactory.getLateEarlyRule(
      context.companyName,
      context.attendanceGroupName,
      context.employee.employeeType?.typeName,
    );

    let totalLateMin = 0;
    let totalEarlyMin = 0;
    let missInPenalty = 0;
    let missOutPenalty = 0;

    // SỬA TẠI ĐÂY: Tạo mốc thời gian chuẩn ca làm việc theo UTC để so sánh với punch_time
    const onTime = this.parseTimeUTC(context.date, context.shiftContext.rule.onTime!);
    const offTime = this.parseTimeUTC(context.date, context.shiftContext.rule.offTime!);

    for (const punch of context.punches) {
      // 1. Xử lý Check-in
      if (punch.check_in_time) {
        // differenceInMinutes(A, B) = A - B
        const lateMin = differenceInMinutes(punch.check_in_time, onTime);
        
        // Chỉ tính phạt nếu lateMin > 0 (tức là đến sau giờ onTime)
        if (lateMin > rule.allowedLateMinutes) {
          totalLateMin += lateMin;
          punch.late_hours = lateMin / 60;

          let penalty = 0;
          for (const p of rule.latePenalties.sort((a, b) => b.threshold - a.threshold)) {
            if (lateMin >= p.threshold) {
              penalty = p.penalty;
              break;
            }
          }
          context.latePenalty += penalty;
        } else {
          // Đi sớm hoặc đúng giờ thì late_hours phải bằng 0
          punch.late_hours = 0;
        }
      } else {
        punch.check_in_time = onTime; 
        punch.miss_check_in = true;
        missInPenalty += rule.missCheckInPenalty;
      }

      // 2. Xử lý Check-out
      if (punch.check_out_time) {
        // differenceInMinutes(offTime, punch_time) = Giờ về quy định - Giờ về thực tế
        const earlyMin = differenceInMinutes(offTime, punch.check_out_time);
        
        if (earlyMin > rule.allowedEarlyMinutes) {
          totalEarlyMin += earlyMin;
          punch.early_hours = earlyMin / 60;

          let penalty = 0;
          for (const p of rule.earlyPenalties.sort((a, b) => b.threshold - a.threshold)) {
            if (earlyMin >= p.threshold) {
              penalty = p.penalty;
              break;
            }
          }
          context.earlyPenalty += penalty;
        } else {
          punch.early_hours = 0;
        }
      } else if (punch.check_in_time) {
        missOutPenalty += rule.missCheckOutPenalty; 
        punch.check_out_time = offTime; 
        punch.miss_check_out = true;
      }
    }

    context.totalLateMinutes = totalLateMin;
    context.totalEarlyMinutes = totalEarlyMin;
    context.missPenalty = missInPenalty + missOutPenalty;
  }

  private parseTimeUTC(date: Date, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const dt = new Date(date);
    dt.setUTCHours(h, m, 0, 0); 
    return dt;
  }
}

/**
 * LateEarlyStrategy
 * 
 * Mục đích: 
 *   - Tính thời gian trễ (late) khi check-in muộn so với giờ vào ca chuẩn (onTime)
 *   - Tính thời gian về sớm (early) khi check-out sớm so với giờ ra ca chuẩn (offTime)
 *   - Áp dụng phạt trừ công (penalty) theo ngưỡng động từ RuleFactory
 *   - Xử lý phạt khi miss check-in / miss check-out (quên chấm công)
 *   - Lưu tổng hợp phạt để trừ vào actual_workday ở strategy sau
 * 
 * Input (qua context):
 *   - context.shiftContext.rule: onTime, offTime (giờ chuẩn vào/ra ca)
 *   - context.punches: Mảng các cặp punch (check_in_time, check_out_time)
 *   - context.date: Ngày tính công
 *   - context.companyName, context.attendanceGroupName, context.employee.employeeType: Để lấy rule động
 * 
 * Output: Không return gì (void)
 *   - Cập nhật context:
 *     - totalLateMinutes, totalEarlyMinutes (tổng phút trễ/sớm)
 *     - latePenalty, earlyPenalty (số công bị trừ do trễ/sớm)
 *     - missPenalty (tổng phạt do miss in/out)
 *   - Cập nhật từng punch: late_hours, early_hours (để lưu DB)
 * 
 * Ví dụ minh họa (ca 8:00-12:00 & 13:00-17:00)
 * Giả sử rule từ RuleFactory (cho công ty STAAAR):
 *   - allowedLateMinutes: 15
 *   - latePenalties: [{threshold:15, penalty:0.25}, {threshold:45, penalty:0.5}, {threshold:90, penalty:1.0}]
 *   - missCheckInPenalty: 1.0
 *   - missCheckOutPenalty: 0.5
 * 
 * 1. Trễ 20 phút (check-in 08:20)
 *    - lateMin = 20 > 15 → totalLateMin = 20
 *    - punch.late_hours ≈ 0.33
 *    - Penalty: 20 >= 15 → trừ 0.25 công → context.latePenalty += 0.25
 * 
 * 2. Trễ nặng 70 phút (check-in 09:10)
 *    - lateMin = 70
 *    - Penalty: 70 >= 45 → trừ 0.5 công (ngưỡng cao hơn)
 *    - Nếu >=90 phút → trừ 1.0 công (coi như vắng)
 * 
 * 3. Về sớm 40 phút (check-out 16:20)
 *    - earlyMin = 40 (giả sử allowedEarlyMinutes = 10)
 *    - punch.early_hours ≈ 0.67
 *    - Penalty: tùy earlyPenalties (ví dụ >30p trừ 0.25 công)
 * 
 * 4. Miss check-in hoàn toàn (không vào)
 *    - missInPenalty += 1.0 → trừ 1 công (vắng)
 * 
 * 5. Có check-in nhưng miss check-out
 *    - missOutPenalty += 0.5 → trừ 0.5 công
 *    - Tự động default check_out_time = 17:00 (để tính giờ làm ở strategy sau)
 * 
 * Logic phạt:
 *   - Chỉ phạt nếu vượt ngưỡng allowed (thường 5-15 phút)
 *   - Penalty lấy ngưỡng cao nhất thỏa mãn (sort descending)
 *   - Nhân viên TTS/CTV/... có thể ignore phạt hoàn toàn
 *   - Miss check-in/out phạt nặng hơn trễ/sớm thông thường
 */