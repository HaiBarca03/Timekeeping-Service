import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';
import { AttendancePunchRecord } from '../../entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from '../../entities/attendance-daily-punch.entity';

@Injectable()
export class StorePunchStrategy {
  private readonly logger = new Logger(StorePunchStrategy.name);

  process(context: CalculationContext, rawPunches: AttendancePunchRecord[]) {
    this.logger.debug(
      `[DEBUG] Effective AllowLate from Context: ${context['allowLateMinutes']}`,
    );
    this.logger.debug(
      `[DEBUG] AllowLate from Shift Rule: ${context.shiftContext?.rule?.allowLateMinutes}`,
    );
    this.logger.debug('===== STORE PUNCH STRATEGY START =====');

    if (!context.shiftContext || !context.shiftContext.assignments) {
      this.logger.warn('ShiftContext or assignments are undefined');
      return;
    }

    this.logger.debug(`Total raw punches: ${rawPunches.length}`);

    const resultPunches: AttendanceDailyPunch[] = [];

    for (const assignment of context.shiftContext.assignments) {
      const shiftStart = new Date(assignment.onTime);
      const shiftEnd = new Date(assignment.offTime);

      // 1. THIẾT LẬP VÙNG ĐỆM: Chỉ cho phép lệch 15 phút
      const bufferStart = new Date(shiftStart.getTime() - 15 * 60000);
      const bufferEnd = new Date(shiftEnd.getTime() + 15 * 60000);

      this.logger.debug(
        `---- CHECKING SHIFT ${assignment.shiftId} (${shiftStart.toISOString()} - ${shiftEnd.toISOString()}) ----`,
      );

      const shiftPunches = rawPunches.filter((p) => {
        const pTime = new Date(p.punch_time);
        return pTime >= bufferStart && pTime <= bufferEnd;
      });

      const currentPunchResult = new AttendanceDailyPunch();
      currentPunchResult.punch_index = resultPunches.length + 1;

      if (shiftPunches.length >= 2) {
        currentPunchResult.check_in_time = shiftPunches[0].punch_time;
        currentPunchResult.check_out_time =
          shiftPunches[shiftPunches.length - 1].punch_time;
      } else if (shiftPunches.length === 1) {
        const pTime = new Date(shiftPunches[0].punch_time);
        const distToStart = Math.abs(pTime.getTime() - shiftStart.getTime());
        const distToEnd = Math.abs(pTime.getTime() - shiftEnd.getTime());

        // Nếu gần Start hơn -> Là IN, thiếu OUT. Ngược lại là OUT, thiếu IN.
        if (distToStart < distToEnd) {
          currentPunchResult.check_in_time = shiftPunches[0].punch_time;
          currentPunchResult.miss_check_out = true;
        } else {
          currentPunchResult.check_out_time = shiftPunches[0].punch_time;
          currentPunchResult.miss_check_in = true;
        }
        this.logger.warn(
          `Shift ${assignment.shiftId}: Single punch detected at ${pTime.toISOString()}`,
        );
      } else {
        currentPunchResult.miss_check_in = true;
        currentPunchResult.miss_check_out = true;
        this.logger.warn(
          `Shift ${assignment.shiftId}: Missed entirely (No punches in buffer)`,
        );
      }

      resultPunches.push(currentPunchResult);
    }

    context.punches = resultPunches;

    this.logger.debug('FINAL DAILY PUNCHES');
    this.logger.debug(JSON.stringify(context.punches, null, 2));
    this.logger.debug('===== STORE PUNCH STRATEGY END =====');
  }
}
