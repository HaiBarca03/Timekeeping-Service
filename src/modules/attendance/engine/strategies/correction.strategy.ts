import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';
import { RequestStatus } from 'src/constants/req-status.contants';

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
        status: RequestStatus.APPROVED,
        type: RequestType.CORRECTION,
        is_counted: true,
      },
      relations: ['detail_adjustment'],
    });

    if (!request) return;

    const detail = request.detail_adjustment;
    if (!detail?.replenishment_time) return;

    const rule = shiftContext?.rule;

    const parseMin = (timeInput: any): number => {
      if (!timeInput) return -1;
      if (timeInput instanceof Date) {
        return timeInput.getHours() * 60 + timeInput.getMinutes();
      }
      if (typeof timeInput === 'string' && timeInput.includes(':')) {
        const [h, m] = timeInput.split(':').map(Number);
        return h * 60 + m;
      }
      return -1;
    };

    const replenishmentTime = new Date(detail.replenishment_time);
    const replenishMinutes =
      replenishmentTime.getHours() * 60 + replenishmentTime.getMinutes();

    // Xác định check-in hay check-out cần bù:
    // Bước 1: parse keyword từ original_record (ưu tiên, rõ ràng nhất)
    //   "Start time 08:00. No record" → check-in bị thiếu
    //   "End time 17:00. No record"   → check-out bị thiếu
    // Bước 2 (fallback): nếu không có keyword rõ ràng (VD: check-in sai giờ 8h10 → sửa 8h)
    //   → so khoảng cách replenishment_time với onTime vs offTime
    const originalRecord = (detail.original_record || '').toLowerCase();
    let isCheckInCorrection: boolean;

    if (
      originalRecord.includes('start time') ||
      originalRecord.includes('check-in') ||
      originalRecord.includes('checkin')
    ) {
      isCheckInCorrection = true;
    } else if (
      originalRecord.includes('end time') ||
      originalRecord.includes('check-out') ||
      originalRecord.includes('checkout')
    ) {
      isCheckInCorrection = false;
    } else if (rule) {
      const onMinutes = parseMin(rule.onTime);
      const offMinutes = parseMin(rule.offTime);

      if (onMinutes >= 0 && offMinutes >= 0) {
        isCheckInCorrection =
          Math.abs(replenishMinutes - onMinutes) <=
          Math.abs(replenishMinutes - offMinutes);
      } else {
        isCheckInCorrection = true; // default: check-in
      }
    } else {
      isCheckInCorrection = true; // default
    }

    // Log kết quả xác định loại correction
    if (isCheckInCorrection) {
      this.logger.log(`[CORRECTION] Bù check-in: ${replenishmentTime.toISOString()}`);
    } else {
      this.logger.log(`[CORRECTION] Bù check-out: ${replenishmentTime.toISOString()}`);
    }

    // Reset penalty tương ứng
    if (rule) {
      if (isCheckInCorrection) {
        context.totalLateMinutes = 0;
        context.latePenalty = 0;
      } else {
        context.totalEarlyMinutes = 0;
        context.earlyPenalty = 0;
      }
    }

    // Đã được duyệt correction → xóa penalty thiếu chấm, tính đủ công
    context.missPenalty = 0;

    const standardHours =
      shiftContext?.getStandardWorkHours(
        context.isMaternityShift,
        context.attendanceGroupCode,
      ) || 8;

    const calculatedWorkday = standardHours / 8;
    context.finalActualWorkday = calculatedWorkday;
    context.finalTotalWorkday = calculatedWorkday;

    // adjustmentHours sẽ được tính ở engine sau workday calc:
    // = standardHours - totalWorkedHours (giờ được bù thêm nhờ correction)
    context['isManualCorrected'] = true;
    context['correctionStandardHours'] = standardHours;
    this.logger.log(
      `[CORRECTION] Result: ${calculatedWorkday} công (Standard Hours: ${standardHours}h)`,
    );
  }
}
