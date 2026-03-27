import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';

@Injectable()
export class CorrectionStrategy {
  private readonly logger = new Logger(CorrectionStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    const { employee, date, shiftContext } = context;
    const dateString = date.toISOString().split('T')[0];

    const request = await this.requestRepo.findOne({
      where: {
        employee_id: employee.id,
        applied_date: dateString as any,
        status: 'APPROVED',
        type: RequestType.CORRECTION,
        is_counted: true,
      },
      relations: ['detail_adjustment'],
    });

    if (!request) return;

    const detail = request.detail_adjustment;
    const rule = shiftContext?.rule;

    if (detail?.replenishment_time && rule) {
      const { onTime, offTime } = rule;
      const correctedTime = new Date(detail.replenishment_time);
      const replenishmentMinutes =
        correctedTime.getHours() * 60 + correctedTime.getMinutes();

      const parseMin = (timeStr: any) => {
        if (typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const onMinutes = parseMin(onTime);
      const offMinutes = parseMin(offTime);

      if (
        Math.abs(replenishmentMinutes - onMinutes) <
        Math.abs(replenishmentMinutes - offMinutes)
      ) {
        context.totalLateMinutes = 0;
        context.latePenalty = 0;
      } else {
        context.totalEarlyMinutes = 0;
        context.earlyPenalty = 0;
      }
    }

    //việc giảm 1h nếu là STORE_GROUP + Thai sản
    const standardHours =
      shiftContext?.getStandardWorkHours(
        context.isMaternityShift,
        context.attendanceGroupCode,
      ) || 8;

    const calculatedWorkday = standardHours / 8;

    context.missPenalty = 0;
    context.finalActualWorkday = calculatedWorkday;
    context.finalTotalWorkday = calculatedWorkday;

    context['isManualCorrected'] = true;
    this.logger.log(
      `[CORRECTION] Result: ${calculatedWorkday} công (Standard Hours: ${standardHours}h)`,
    );
  }
}
