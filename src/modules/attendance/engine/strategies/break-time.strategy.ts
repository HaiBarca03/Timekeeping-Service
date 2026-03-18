import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';
import { differenceInMinutes, isBefore, isAfter, max, min } from 'date-fns';

@Injectable()
export class BreakTimeStrategy {
  private readonly logger = new Logger(BreakTimeStrategy.name);

  process(context: CalculationContext): void {
    const groupCode = context.employee.attendanceGroup?.code;
    
    // Chỉ áp dụng cho khối Văn phòng (Hoặc các nhóm không phải STORE/FACTORY nếu bạn muốn)
    if (groupCode === 'STORE_GROUP' || groupCode === 'FACTORY_GROUP') {
      this.logger.debug(`Skip BreakTimeStrategy for group: ${groupCode}`);
      return;
    }

    this.logger.log('========== START BreakTimeStrategy (Office) ==========');

    const restRules = context.shiftContext?.restRules || [];
    if (restRules.length === 0) {
      this.logger.warn('No rest rules found for this shift.');
      return;
    }

    let totalRestMinutes = 0;

    for (const punch of context.punches) {
      const punchIn = punch.check_in_actual || punch.check_in_time;
      const punchOut = punch.check_out_actual || punch.check_out_time;

      if (!punchIn || !punchOut) continue;

      for (const rule of restRules) {
        // Chuyển string "HH:mm" thành object Date của ngày đang tính toán
        const restStart = this.parseTimeToDate(context.date, rule.restBeginTime);
        const restEnd = this.parseTimeToDate(context.date, rule.restEndTime);

        // Tính toán sự giao thoa giữa (punchIn -> punchOut) và (restStart -> restEnd)
        // Công thức: Overlap = min(End1, End2) - max(Start1, Start2)
        const overlapStart = max([punchIn, restStart]);
        const overlapEnd = min([punchOut, restEnd]);

        if (isBefore(overlapStart, overlapEnd)) {
          const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);
          totalRestMinutes += overlapMinutes;
          
          this.logger.debug(
            `Detected overlap with rest rule [${rule.restBeginTime}-${rule.restEndTime}]: ${overlapMinutes} mins`
          );
        }
      }
    }

    // Lưu kết quả vào context để WorkdayCalculationStrategy sử dụng
    // Bạn có thể thêm property này vào CalculationContext DTO nếu chưa có
    context['totalRestMinutesValue'] = totalRestMinutes; 
    
    this.logger.log(`Total Break Time deducted: ${totalRestMinutes} minutes`);
    this.logger.log('========== END BreakTimeStrategy ==========');
  }

  private parseTimeToDate(baseDate: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}