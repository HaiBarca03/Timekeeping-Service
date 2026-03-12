import { Injectable, Logger } from "@nestjs/common";
import { CalculationContext } from "../dto/calculation-context.dto";
import { AttendancePunchRecord } from "../../entities/attendance-punch-record.entity";
import { AttendanceDailyPunch } from "../../entities/attendance-daily-punch.entity";

@Injectable()
export class StorePunchStrategy {

  private readonly logger = new Logger(StorePunchStrategy.name);

  process(context: CalculationContext, rawPunches: AttendancePunchRecord[]) {

    this.logger.debug("===== STORE PUNCH STRATEGY START =====");

    if (!context.shiftContext) {
      this.logger.warn("ShiftContext is undefined");
      return;
    }

    this.logger.debug(`Total raw punches: ${rawPunches.length}`);
    this.logger.debug(JSON.stringify(rawPunches, null, 2));

    const punches: AttendanceDailyPunch[] = [];

    for (const assignment of context.shiftContext.assignments) {

      const shiftStart = assignment.onTime;
      const shiftEnd = assignment.offTime;

      this.logger.debug("---- CHECK SHIFT ----");
      this.logger.debug(JSON.stringify({
        shiftId: assignment.shiftId,
        start: shiftStart,
        end: shiftEnd
      }, null, 2));

      const shiftPunches = rawPunches.filter(p =>
        p.punch_time >= shiftStart &&
        p.punch_time < shiftEnd
      );

      this.logger.debug(`Punches matched in shift: ${shiftPunches.length}`);
      this.logger.debug(JSON.stringify(shiftPunches, null, 2));

      const punch = new AttendanceDailyPunch();
      punch.punch_index = punches.length + 1;

      if (shiftPunches.length > 0) {

        punch.check_in_time = shiftPunches[0].punch_time;
        punch.check_out_time = shiftPunches[shiftPunches.length - 1].punch_time;

        this.logger.debug("Punch result");
        this.logger.debug(JSON.stringify({
          checkIn: punch.check_in_time,
          checkOut: punch.check_out_time
        }, null, 2));

      } else {

        punch.miss_check_in = true;
        punch.miss_check_out = true;

        this.logger.debug("Missed shift (no punches)");

      }

      punches.push(punch);
    }

    context.punches = punches;

    this.logger.debug("FINAL DAILY PUNCHES");
    this.logger.debug(JSON.stringify(context.punches, null, 2));

    this.logger.debug("===== STORE PUNCH STRATEGY END =====");

  }
}