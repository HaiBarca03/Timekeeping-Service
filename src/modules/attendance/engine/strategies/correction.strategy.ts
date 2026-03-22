import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../leave-management/entities/attendance-request.entity';

@Injectable()
export class CorrectionStrategy {
  private readonly logger = new Logger(CorrectionStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) {}

  async process(context: CalculationContext): Promise<void> {
    const { employee, date, shiftContext } = context;
    const dateString = date.toISOString().split('T')[0];

    // 1. Tìm đơn CORRECTION hoặc MATERNITY (nếu gộp chung logic điều chỉnh)
    const request = await this.requestRepo.findOne({
      where: {
        employee_id: employee.id,
        applied_date: dateString as any,
        status: 'Approved',
        type: RequestType.CORRECTION, // Hoặc dùng mảng [RequestType.CORRECTION, RequestType.MATERNITY]
        is_counted: true,
      },
      relations: ['detail_adjustment'],
    });

    if (!request) return;

    const detail = request.detail_adjustment;
    const rule = shiftContext?.rule;

    // 2. XÓA PHẠT GIỜ GIẤC (Dựa trên ReplenishmentTime từ Lark)
    if (detail?.replenishment_time && rule) {
      const { onTime, offTime } = rule;
      const correctedTime = new Date(Number(detail.replenishment_time));
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

    // 3. TÍNH TOÁN CÔNG DỰA TRÊN HÀM getStandardWorkHours
    // Lấy giờ chuẩn (có tính đến việc giảm 1h nếu là STORE_GROUP + Thai sản)
    const standardHours =
      shiftContext?.getStandardWorkHours(
        context.isMaternityShift,
        context.attendanceGroupCode, // Hoặc employee.attendanceGroup?.groupCode
      ) || 8;

    // Quy đổi giờ ra công (Ví dụ: 8h chuẩn = 1 công, 4h chuẩn = 0.5 công)
    // Lưu ý: Nếu thai sản làm 7h nhưng vẫn tính 1 công, thì chia cho (standardHours + 1) tùy logic cty
    const calculatedWorkday = standardHours / 8;

    // Xóa phạt thiếu vân tay và chốt công
    context.missPenalty = 0;
    context.finalActualWorkday = calculatedWorkday;
    context.finalTotalWorkday = calculatedWorkday;

    context['isManualCorrected'] = true;
    this.logger.log(
      `[CORRECTION] Result: ${calculatedWorkday} công (Standard Hours: ${standardHours}h)`,
    );
  }
}
