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
      if (context.isConfiguredOffDay) {
          this.logger.log('Configured Off Day detected → skip LateEarlyStrategy');
          context.totalLateMinutes = 0;
          context.totalEarlyMinutes = 0;
          return;
      }

      if (!context.shiftContext?.rule) {
          this.logger.warn('No shift rule found → skip LateEarlyStrategy');
          return;
      }

      const rule = this.ruleFactory.getLateEarlyRule(
        context.companyName,
        context.attendanceGroupName,
        context.employee.employeeType?.typeName,
      );

      const shiftStart = context.shiftContext.rule.onTime;
      const shiftEnd = context.shiftContext.rule.offTime;

      let totalLate = 0;
      let totalEarly = 0;
      let missPenalty = 0;

      for (const punch of context.punches) {
        this.logger.log('----- Processing Punch -----');
        
        // SỬA 1: Khai báo ở đây để đoạn check bên dưới không bị báo lỗi "Cannot find name"
        let finalLate = 0;
        let finalEarly = 0;

        // =========================
        // LATE
        // =========================
        if (punch.check_in_time) {
          const actualShiftStart = this.getShiftTimeOnDate(punch.check_in_time, shiftStart);
          const lateMin = Math.max(0, differenceInMinutes(punch.check_in_time, actualShiftStart));
          finalLate = lateMin;

          if (lateMin <= rule.allowedLateMinutes) finalLate = 0;
          if (this.hasLeaveStart(context, shiftStart)) finalLate = 0;
          if (this.hasRemoteStart(context, shiftStart)) finalLate = 0;

          punch.late_hours = finalLate / 60;
          totalLate += finalLate;

          if (finalLate > 0) {
            const penalty = this.calculatePenalty(finalLate, rule.latePenalties);
            context.latePenalty += penalty;
          }
        } else {
          punch.miss_check_in = true;
        }

        // =========================
        // EARLY
        // =========================
        if (punch.check_out_time) {
          const actualShiftStart = this.getShiftTimeOnDate(punch.check_out_time, shiftStart);
          const earlyMin = Math.max(0, differenceInMinutes(shiftEnd, actualShiftStart));
          finalEarly = earlyMin;

          if (this.hasLeaveEnd(context, shiftEnd)) finalEarly = 0;
          if (this.hasRemoteEnd(context, shiftEnd)) finalEarly = 0;

          punch.early_hours = finalEarly / 60;
          totalEarly += finalEarly;

          if (finalEarly > rule.allowedEarlyMinutes) {
            const penalty = this.calculatePenalty(finalEarly, rule.earlyPenalties);
            context.earlyPenalty += penalty;
          }
        } else {
          punch.miss_check_out = true;
        }

        // ============================================================
        // SỬA 2: ĐẶT FLAG ÉP 0 CÔNG NẾU VI PHẠM (1 PHÚT CŨNG CHÉM)
        // ============================================================
        if (finalLate > 0 || finalEarly > 0 || punch.miss_check_in || punch.miss_check_out) {
          this.logger.warn(`STRICT RULE: Violation detected. Force 0 work hours for this punch.`);
          // Đánh dấu vào object punch để WorkdayCalculationStrategy biết đường mà xử lý
          punch['is_invalid_workday'] = true; 
        }

        const isFactoryGroup = context.attendanceGroupCode === 'FACTORY_GROUP';

        if (!isFactoryGroup) {
            if (finalLate > 0 || finalEarly > 0 || punch.miss_check_in || punch.miss_check_out) {
                this.logger.warn(`STRICT RULE: Violation detected. Force 0 work hours.`);
                punch['is_invalid_workday'] = true; 
            }
        } else {
            this.logger.debug(`FACTORY GROUP: Skip strict late/early rule.`);
        }

        const isSaturday = context.date.getDay() === 6;
        if (isSaturday && !context.isConfiguredOffDay) {
            if (context.totalLateMinutes > 0 || context.totalEarlyMinutes > 0) {
                this.logger.warn("Saturday violation: No partial work allowed.");
            }
        }

        this.logger.debug(
          `Punch Result → late_hours=${punch.late_hours}, early_hours=${punch.early_hours}, is_invalid=${punch['is_invalid_workday']}`,
        );
      }

      context.totalLateMinutes = totalLate;
      context.totalEarlyMinutes = totalEarly;
      context.missPenalty += missPenalty;

      this.logger.log('========== END LateEarlyStrategy ==========');
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

  private getShiftTimeOnDate(targetDate: Date, shiftTime: Date): Date {
    const result = new Date(targetDate); // Lấy ngày của punch (Ngày chấm công)
    result.setHours(shiftTime.getHours());
    result.setMinutes(shiftTime.getMinutes());
    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
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