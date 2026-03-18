import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class ActualCheckTimeStrategy {

  private readonly logger = new Logger(ActualCheckTimeStrategy.name);

  process(context: CalculationContext): void {

    this.logger.log('===== START ActualCheckTimeStrategy =====');

    if (!context.shiftContext?.rule) {
      this.logger.warn('No shift rule found, skipping calculation');
      return;
    }

    const shiftStart = context.shiftContext.rule.onTime;
    const shiftEnd = context.shiftContext.rule.offTime;

    this.logger.debug(`Shift Start: ${shiftStart}`);
    this.logger.debug(`Shift End: ${shiftEnd}`);

    for (const punch of context.punches) {

      this.logger.log('---- Processing Punch ----');
      this.logger.debug(`Original Check-in: ${punch.check_in_time}`);
      this.logger.debug(`Original Check-out: ${punch.check_out_time}`);

      if (punch.check_in_time) {

        const actualCheckIn =
          punch.check_in_time < shiftStart ? shiftStart : punch.check_in_time;

        this.logger.debug(
          `Compare check-in (${punch.check_in_time}) with shiftStart (${shiftStart})`
        );

        this.logger.debug(`Actual Check-in Result: ${actualCheckIn}`);

        punch.check_in_actual = actualCheckIn;
      }

      if (punch.check_out_time) {

        const actualCheckOut =
          punch.check_out_time > shiftEnd ? shiftEnd : punch.check_out_time;

        this.logger.debug(
          `Compare check-out (${punch.check_out_time}) with shiftEnd (${shiftEnd})`
        );

        this.logger.debug(`Actual Check-out Result: ${actualCheckOut}`);

        punch.check_out_actual = actualCheckOut;
      }

      this.logger.debug(
        `Final Punch Result -> check_in_actual: ${punch.check_in_actual}, check_out_actual: ${punch.check_out_actual}`
      );
    }

    this.logger.log('===== END ActualCheckTimeStrategy =====');
  }

  private parseTime(date: Date, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);

    this.logger.debug(`parseTime -> ${timeStr} => ${dt.toISOString()}`);

    return dt;
  }
}