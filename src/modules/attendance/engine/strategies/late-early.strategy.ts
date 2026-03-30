import { Injectable, Logger } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';
import { CalculationContext } from '../dto/calculation-context.dto';
import { RuleFactoryService } from '../services/rule-factory.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRequest, RequestType } from '../../../approval-management/entities/attendance-request.entity';
import { RequestStatus } from 'src/constants/approval-status.constants';

@Injectable()
export class LateEarlyStrategy {
  private readonly logger = new Logger(LateEarlyStrategy.name);

  constructor(
    private ruleFactory: RuleFactoryService,
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    this.logger.debug(
      `[DEBUG] Effective AllowLate from Context: ${context['allowLateMinutes']}`,
    );
    this.logger.debug(
      `[DEBUG] AllowLate from Shift Rule: ${context.shiftContext?.rule?.allowLateMinutes}`,
    );
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

    const dateStr = context.date.toISOString().split('T')[0];

    const approvedRequests = await this.requestRepo
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.detail_time_off', 'detail')
      .where('request.employee_id = :employeeId', { employeeId: context.employee.id })
      .andWhere('request.type IN (:...types)', { types: [RequestType.LEAVE, RequestType.REMOTE] })
      .andWhere('request.status = :status', { status: RequestStatus.APPROVED })
      .andWhere('request.is_counted = :isCounted', { isCounted: true })
      .andWhere(
        ':dateStr BETWEEN CAST(detail.start_time AS DATE) AND CAST(detail.end_time AS DATE)',
        { dateStr }
      )
      .getMany();

    context['dailyRequests'] = approvedRequests || [];

    let totalLate = 0;
    let totalEarly = 0;
    let missPenalty = 0;

    for (const punch of context.punches) {
      this.logger.log('----- Processing Punch -----');

      let finalLate = 0;
      let finalEarly = 0;
      const effectiveAllowedLate =
        context['allowLateMinutes'] ?? rule.allowedLateMinutes;
      const effectiveAllowedEarly =
        context['allowEarlyMinutes'] ?? rule.allowedEarlyMinutes;

      // =========================
      // LATE
      // =========================
      if (punch.check_in_time) {
        const actualShiftStart = this.getShiftTimeOnDate(
          punch.check_in_time,
          shiftStart,
        );
        const lateMin = Math.max(
          0,
          differenceInMinutes(punch.check_in_time, actualShiftStart),
        );
        finalLate = lateMin;

        if (lateMin <= effectiveAllowedLate) finalLate = 0;
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
        const actualShiftEnd = this.getShiftTimeOnDate(
          punch.check_out_time,
          shiftEnd,
        );
        const earlyMin = Math.max(
          0,
          differenceInMinutes(actualShiftEnd, punch.check_out_time),
        );
        finalEarly = earlyMin;

        if (this.hasLeaveEnd(context, shiftEnd)) finalEarly = 0;
        if (this.hasRemoteEnd(context, shiftEnd)) finalEarly = 0;

        punch.early_hours = finalEarly / 60;
        totalEarly += finalEarly;

        if (finalEarly > effectiveAllowedEarly) {
          const penalty = this.calculatePenalty(
            finalEarly,
            rule.earlyPenalties,
          );
          context.earlyPenalty += penalty;
        }
      } else {
        punch.miss_check_out = true;
      }


      // Bỏ block STRICT RULE sai lệch khiến công = 0 khi đi muộn / về sớm.
      // workday-calculation.strategy.ts đã tự bỏ qua ca nếu punch.miss_check_in hoặc punch.miss_check_out = true.

      const isSaturday = context.date.getDay() === 6;
      if (isSaturday && !context.isConfiguredOffDay) {
        if (context.totalLateMinutes > 0 || context.totalEarlyMinutes > 0) {
          this.logger.warn('Saturday violation: No partial work allowed.');
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
    const result = new Date(targetDate);
    result.setHours(shiftTime.getHours());
    result.setMinutes(shiftTime.getMinutes());
    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
  }

  private hasLeaveStart(
    context: CalculationContext,
    shiftStart: Date,
  ): boolean {
    const leaves = (context['dailyRequests'] || []).filter((r: any) => r.type === RequestType.LEAVE);
    for (const l of leaves) {
      if (!l.detail_time_off) continue;
      const start = new Date(l.detail_time_off.start_time);
      const startH = start.getHours();
      // If leave starts in the morning (e.g. <= shiftStart or before noon)
      if (startH <= shiftStart.getHours() + 1) {
        this.logger.debug('Negated Late penalty due to morning Leave');
        return true;
      }
    }
    return false;
  }

  private hasLeaveEnd(context: CalculationContext, shiftEnd: Date): boolean {
    const leaves = (context['dailyRequests'] || []).filter((r: any) => r.type === RequestType.LEAVE);
    for (const l of leaves) {
      if (!l.detail_time_off) continue;
      const end = new Date(l.detail_time_off.end_time);
      const endH = end.getHours();
      // If leave ends in the afternoon (e.g. >= shiftEnd or after noon)
      if (endH >= shiftEnd.getHours() - 1) {
        this.logger.debug('Negated Early penalty due to afternoon Leave');
        return true;
      }
    }
    return false;
  }

  private hasRemoteStart(
    context: CalculationContext,
    shiftStart: Date,
  ): boolean {
    const remotes = (context['dailyRequests'] || []).filter((r: any) => r.type === RequestType.REMOTE);
    for (const r of remotes) {
      if (!r.detail_time_off) continue;
      const start = new Date(r.detail_time_off.start_time);
      const startH = start.getHours();
      if (startH <= shiftStart.getHours() + 1) {
        this.logger.debug('Negated Late penalty due to morning Remote');
        return true;
      }
    }
    return false;
  }

  private hasRemoteEnd(context: CalculationContext, shiftEnd: Date): boolean {
    const remotes = (context['dailyRequests'] || []).filter((r: any) => r.type === RequestType.REMOTE);
    for (const r of remotes) {
      if (!r.detail_time_off) continue;
      const end = new Date(r.detail_time_off.end_time);
      const endH = end.getHours();
      if (endH >= shiftEnd.getHours() - 1) {
        this.logger.debug('Negated Early penalty due to afternoon Remote');
        return true;
      }
    }
    return false;
  }
}
