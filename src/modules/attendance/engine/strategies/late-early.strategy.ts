import { Injectable, Logger } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';
import { CalculationContext } from '../dto/calculation-context.dto';
import { RuleFactoryService } from '../services/rule-factory.service';

@Injectable()
export class LateEarlyStrategy {

  private readonly logger = new Logger(LateEarlyStrategy.name);

  constructor(private ruleFactory: RuleFactoryService) {}

  process(context: CalculationContext): void {

    this.logger.log('========== START LateEarlyStrategy ==========');

    if (!context.shiftContext?.rule) {
      this.logger.warn('No shift rule found → skip LateEarlyStrategy');
      return;
    }

    const rule = this.ruleFactory.getLateEarlyRule(
      context.companyName,
      context.attendanceGroupName,
      context.employee.employeeType?.typeName,
    );

    this.logger.debug(`Company: ${context.companyName}`);
    this.logger.debug(`Attendance Group: ${context.attendanceGroupName}`);
    this.logger.debug(`Employee Type: ${context.employee.employeeType?.typeName}`);
    this.logger.debug(`Rule: ${JSON.stringify(rule)}`);

    const shiftStart = context.shiftContext.rule.onTime;
    const shiftEnd = context.shiftContext.rule.offTime;

    this.logger.debug(`Shift Start: ${shiftStart}`);
    this.logger.debug(`Shift End: ${shiftEnd}`);

    let totalLate = 0;
    let totalEarly = 0;
    let missPenalty = 0;

    for (const punch of context.punches) {

      this.logger.log('----- Processing Punch -----');
      this.logger.debug(JSON.stringify(punch));

      // =========================
      // LATE
      // =========================
      if (punch.check_in_time) {

        this.logger.debug(`Check-in time: ${punch.check_in_time}`);

        const lateMin = Math.max(
          0,
          differenceInMinutes(punch.check_in_time, shiftStart),
        );

        this.logger.debug(`Raw Late Minutes: ${lateMin}`);

        let finalLate = lateMin;

        if (lateMin <= rule.allowedLateMinutes) {
          this.logger.debug(
            `Late (${lateMin}) <= allowed (${rule.allowedLateMinutes}) → ignore`,
          );
          finalLate = 0;
        }

        if (this.hasLeaveStart(context, shiftStart)) {
          this.logger.debug('Leave at shift start → ignore late');
          finalLate = 0;
        }

        if (this.hasRemoteStart(context, shiftStart)) {
          this.logger.debug('Remote at shift start → ignore late');
          finalLate = 0;
        }

        punch.late_hours = finalLate / 60;

        this.logger.debug(`Final Late Minutes: ${finalLate}`);
        this.logger.debug(`Late Hours stored: ${punch.late_hours}`);

        totalLate += finalLate;

        if (finalLate > 0) {

          const penalty = this.calculatePenalty(finalLate, rule.latePenalties);

          this.logger.debug(
            `Late Penalty applied: ${penalty} (minutes=${finalLate})`,
          );

          context.latePenalty += penalty;
        }

      } else {

        this.logger.debug('No check-in detected');

        if (
          !this.hasLeaveStart(context, shiftStart) &&
          !this.hasRemoteStart(context, shiftStart)
        ) {

          this.logger.debug(
            `Miss check-in → penalty ${rule.missCheckInPenalty}`,
          );

          punch.miss_check_in = true;
          missPenalty += rule.missCheckInPenalty;
        }

      }

      // =========================
      // EARLY
      // =========================
      if (punch.check_out_time) {

        this.logger.debug(`Check-out time: ${punch.check_out_time}`);

        const earlyMin = Math.max(
          0,
          differenceInMinutes(shiftEnd, punch.check_out_time),
        );

        this.logger.debug(`Raw Early Minutes: ${earlyMin}`);

        let finalEarly = earlyMin;

        if (this.hasLeaveEnd(context, shiftEnd)) {
          this.logger.debug('Leave at shift end → ignore early');
          finalEarly = 0;
        }

        if (this.hasRemoteEnd(context, shiftEnd)) {
          this.logger.debug('Remote at shift end → ignore early');
          finalEarly = 0;
        }

        punch.early_hours = finalEarly / 60;

        this.logger.debug(`Final Early Minutes: ${finalEarly}`);
        this.logger.debug(`Early Hours stored: ${punch.early_hours}`);

        totalEarly += finalEarly;

        if (finalEarly > rule.allowedEarlyMinutes) {

          const penalty = this.calculatePenalty(
            finalEarly,
            rule.earlyPenalties,
          );

          this.logger.debug(
            `Early Penalty applied: ${penalty} (minutes=${finalEarly})`,
          );

          context.earlyPenalty += penalty;
        }

      } else if (punch.check_in_time) {

        this.logger.debug('No check-out detected');

        if (
          !this.hasLeaveEnd(context, shiftEnd) &&
          !this.hasRemoteEnd(context, shiftEnd)
        ) {

          this.logger.debug(
            `Miss check-out → penalty ${rule.missCheckOutPenalty}`,
          );

          punch.miss_check_out = true;
          missPenalty += rule.missCheckOutPenalty;
        }

      }

      
      this.logger.debug(
        `Punch Result → late_hours=${punch.late_hours}, early_hours=${punch.early_hours}`,
      );

    }

    context.totalLateMinutes = totalLate;
    context.totalEarlyMinutes = totalEarly;
    context.missPenalty += missPenalty;

    this.logger.log('========== END LateEarlyStrategy ==========');

    this.logger.debug(`Total Late Minutes: ${totalLate}`);
    this.logger.debug(`Total Early Minutes: ${totalEarly}`);
    this.logger.debug(`Total Miss Penalty: ${missPenalty}`);
  }

  private calculatePenalty(minutes: number, rules: any[]): number {

    this.logger.debug(`Calculating penalty for ${minutes} minutes`);

    const penalties = [...rules].sort((a, b) => b.threshold - a.threshold);

    for (const p of penalties) {
      if (minutes >= p.threshold) {
        this.logger.debug(
          `Matched threshold ${p.threshold} → penalty ${p.penalty}`,
        );
        return p.penalty;
      }
    }

    this.logger.debug('No penalty rule matched');
    return 0;
  }

  private parseTime(date: Date, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);

    this.logger.debug(`parseTime ${timeStr} → ${dt.toISOString()}`);

    return dt;
  }

  private hasLeaveStart(context: CalculationContext, shiftStart: Date): boolean {
    this.logger.debug('Checking leave at shift start');
    return false;
  }

  private hasLeaveEnd(context: CalculationContext, shiftEnd: Date): boolean {
    this.logger.debug('Checking leave at shift end');
    return false;
  }

  private hasRemoteStart(context: CalculationContext, shiftStart: Date): boolean {
    this.logger.debug('Checking remote at shift start');
    return false;
  }

  private hasRemoteEnd(context: CalculationContext, shiftEnd: Date): boolean {
    this.logger.debug('Checking remote at shift end');
    return false;
  }
}