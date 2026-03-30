import { Injectable, Logger } from '@nestjs/common';
import { ATTENDANCE_GROUPS } from 'src/constants/attendance-group.constants';
import { CalculationContext } from '../dto/calculation-context.dto';
import { differenceInMinutes, isBefore, isAfter, max, min } from 'date-fns';

@Injectable()
export class BreakTimeStrategy {
  private readonly logger = new Logger(BreakTimeStrategy.name);

  process(context: CalculationContext): void {
    const groupCode = context.employee.attendanceGroup?.code;

    if (groupCode === ATTENDANCE_GROUPS.STORE_GROUP_1 || groupCode === ATTENDANCE_GROUPS.STORE_GROUP_2 || groupCode === ATTENDANCE_GROUPS.FACTORY_GROUP) {
      this.logger.debug(`Skip BreakTimeStrategy for group: ${groupCode}`);
      return;
    }

    this.logger.log('========== START BreakTimeStrategy (Office) ==========');

    const rule = context.shiftContext?.restRule;

    if (!rule || !rule.restBeginTime || !rule.restEndTime) {
      this.logger.warn('No valid rest rule found for this shift.');
      return;
    }

    let totalRestMinutes = 0;

    for (const punch of context.punches) {
      const punchIn = punch.check_in_actual || punch.check_in_time;
      const punchOut = punch.check_out_actual || punch.check_out_time;

      if (!punchIn || !punchOut) continue;

      const restStart = this.parseTimeToDate(context.date, rule.restBeginTime);
      const restEnd = this.parseTimeToDate(context.date, rule.restEndTime);

      const overlapStart = max([punchIn, restStart]);
      const overlapEnd = min([punchOut, restEnd]);

      if (isBefore(overlapStart, overlapEnd)) {
        const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);
        totalRestMinutes += overlapMinutes;

        this.logger.debug(
          `Detected overlap with rest rule [${rule.restBeginTime}-${rule.restEndTime}]: ${overlapMinutes} mins`,
        );
      }
    }

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
