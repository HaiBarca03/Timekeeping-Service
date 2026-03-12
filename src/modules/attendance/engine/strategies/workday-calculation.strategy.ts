import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class WorkdayCalculationStrategy {
  private readonly logger = new Logger(WorkdayCalculationStrategy.name);

  process(context: CalculationContext): void {
    let totalMinutes = 0;

    for (const punch of context.punches) {
      // SỬA: Dùng check_in_time/check_out_time thay vì actual nếu actual trống
      const inTime = punch.check_in_actual || punch.check_in_time;
      const outTime = punch.check_out_actual || punch.check_out_time;

      this.logger.debug(`Processing punch for calculation: In=${inTime}, Out=${outTime}`);

      // KIỂM TRA QUY TẮC CỦA BẠN: Nếu muộn hoặc sớm hoặc thiếu punch -> 0 công
      if (punch.miss_check_in || punch.miss_check_out || punch['is_invalid_workday']) {
        this.logger.warn(`Punch rejected (0 hours) due to: Late/Early or Missed Punch`);
        continue; // Bỏ qua không cộng phút nào từ punch này
      }

      if (inTime && outTime) {
        const diff = (new Date(outTime).getTime() - new Date(inTime).getTime()) / 60000;
        
        // Trừ thời gian nghỉ nếu có (Rest Rules) - Bạn nên bổ sung logic này
        this.logger.debug(`Minutes worked in punch: ${diff}`);
        totalMinutes += Math.max(0, diff);
      }
    }

    context.totalWorkedHours = totalMinutes / 60;
    this.logger.debug(`Total worked hours final: ${context.totalWorkedHours}`);
  }
}