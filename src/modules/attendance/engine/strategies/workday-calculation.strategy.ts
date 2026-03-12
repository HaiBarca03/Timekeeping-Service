import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class WorkdayCalculationStrategy {
  private readonly logger = new Logger(WorkdayCalculationStrategy.name);

  process(context: CalculationContext): void {
    let totalMinutes = 0;

    // 1. Nhận diện nhóm Khối Xưởng (Dùng mã code cho chuẩn, ví dụ 'FACTORY_GROUP')
    // Nếu bạn chưa gán attendanceGroupCode vào context, hãy lấy tạm từ object employee
    const groupCode = context.employee.attendanceGroup?.code;
    const isFactoryGroup = groupCode === 'FACTORY_GROUP' || context.attendanceGroupName === 'Nhóm Khối Xưởng';

    for (const punch of context.punches) {
      const inTime = punch.check_in_actual || punch.check_in_time;
      const outTime = punch.check_out_actual || punch.check_out_time;

      this.logger.debug(`Processing punch for calculation: In=${inTime}, Out=${outTime} (IsFactory=${isFactoryGroup})`);

      // 2. KIỂM TRA QUY TẮC REJECT
      if (!isFactoryGroup) {
        if (punch.miss_check_in || punch.miss_check_out || punch['is_invalid_workday']) {
          this.logger.warn(`Punch rejected for Office/Store: Late/Early or Missed Punch detected.`);
          continue; 
        }
      } else {
        if (!inTime || !outTime) {
          this.logger.warn(`Punch rejected for Factory: Missing data to calculate hours.`);
          continue;
        }
      }

      // 3. TÍNH GIỜ LÀM VIỆC THỰC TẾ
      if (inTime && outTime) {
        let diff = (new Date(outTime).getTime() - new Date(inTime).getTime()) / 60000;

        // Giả sử mỗi ca làm việc có 1 tiếng nghỉ trưa (60p)
        // Nếu muốn chuẩn hơn, bạn dùng context.shiftContext.restRules để trừ
        const restMinutes = 60; 
        if (diff > 240) { // Nếu làm trên 4 tiếng thì mới trừ giờ nghỉ trưa
            diff -= restMinutes;
        }

        this.logger.debug(`Minutes worked in punch (after rest): ${diff}`);
        totalMinutes += Math.max(0, diff);
      }
    }

    let finalHours = totalMinutes / 60;

    // 4. LOGIC ĐẶC THÙ CHO KHỐI XƯỞNG
    if (isFactoryGroup) {
      if (finalHours >= 8) {
        this.logger.debug(`FACTORY RULE: Worked ${finalHours}h >= 8h -> Rounded to 8h (1 công)`);
        finalHours = 8; 
      } else {
        this.logger.debug(`FACTORY RULE: Worked ${finalHours}h < 8h -> Keep actual: ${finalHours}h`);
        // Giữ nguyên giờ thực tế để tính công lẻ (ví dụ 0.5, 0.7 công)
      }
    }

    context.totalWorkedHours = finalHours;
    this.logger.debug(`Total worked hours final: ${context.totalWorkedHours}`);
  }
}