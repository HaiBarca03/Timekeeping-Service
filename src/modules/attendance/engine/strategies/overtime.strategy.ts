import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OvertimeRequest } from 'src/modules/leave-management/entities/overtime-request.entity';
import { CalculationContext } from '../dto/calculation-context.dto';
import { OvertimeConversionCode } from 'src/constants/overtime-conversion.enum';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class OvertimeStrategy {
  constructor(
    @InjectRepository(OvertimeRequest)
    private overtimeRepo: Repository<OvertimeRequest>,
  ) {}

  /**
   * Xử lý OT request cho ngày và cập nhật context
   */
  async process(context: CalculationContext): Promise<void> {
    const employeeId = context.employee.id;
    const date = context.date;

    // Xác định khoảng thời gian trong ngày (00:00 → 23:59:59)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query OT request approved trong ngày
    const otRequests = await this.overtimeRepo.find({
      where: {
        requester_id: employeeId,
        status: 'approved',
        start_time: Between(startOfDay, endOfDay),
      },
      relations: ['conversion_type'],
    });

    let totalPaidOtMinutes = 0;

    // Duyệt từng OT request
    for (const request of otRequests) {
      // Tính thời gian OT thô (phút)
      const otDurationMinutes = differenceInMinutes(
        request.end_time,
        request.start_time,
      );

      // Áp dụng hệ số nhân từ conversion_type
      const multiplier = request.conversion_type?.multiplier || 1.0;
      const effectiveOtMinutes = otDurationMinutes * multiplier;

      // Phân loại theo conversion code
      const conversionCode =
        request.conversion_type?.conversionName as OvertimeConversionCode;

      if (conversionCode === OvertimeConversionCode.COMPENSATORY_LEAVE) {
        // OT chuyển sang phép bù → cộng vào quỹ phép (không ảnh hưởng công ngày)
        context.overtimeCompensatoryMinutes =
          (context.overtimeCompensatoryMinutes || 0) + effectiveOtMinutes;
      } else {
        // OT trả lương → cộng vào overtimeMinutes để tính công sau
        totalPaidOtMinutes += effectiveOtMinutes;
      }
    }

    // Lưu tổng OT trả lương vào context
    context.overtimeMinutes = totalPaidOtMinutes;
  }
}

/**
 * OvertimeStrategy
 * 
 * Mục đích: 
 *   - Xử lý các yêu cầu tăng ca (Overtime Request) được approved cho ngày tính công
 *   - Tính thời gian OT thực tế (start_time → end_time)
 *   - Áp dụng hệ số nhân (multiplier) từ conversion_type (ví dụ 150%, 200%...)
 *   - Phân loại OT theo loại chuyển đổi:
 *     - COMPENSATORY_LEAVE: Cộng vào quỹ phép bù (overtimeCompensatoryMinutes) → không cộng công ngày
 *     - Các loại khác (PAYMENT...): Cộng vào OT trả lương (overtimeMinutes) → sẽ cộng công ở WorkdayCalculationStrategy
 * 
 * Input (qua context):
 *   - context.employee.id: ID nhân viên để query OT request
 *   - context.date: Ngày tính công (dùng để lọc OT request trong ngày)
 * 
 * Output: Không return gì (void), chỉ cập nhật context:
 *   - context.overtimeMinutes: Tổng phút OT trả lương (sẽ cộng vào actual_workday)
 *   - context.overtimeCompensatoryMinutes: Tổng phút OT chuyển sang phép bù (sẽ xử lý riêng ở leave balance sau)
 * 
 * Ví dụ minh họa:
 * 
 * Giả sử OT request approved:
 *   1. 18:00 → 20:00 (120 phút), multiplier = 1.5 (150%), conversion = PAYMENT
 *      → effectiveOtMinutes = 120 * 1.5 = 180 phút
 *      → context.overtimeMinutes += 180 (sẽ cộng ~0.225 ngày công nếu standard 8h)
 * 
 *   2. 17:00 → 19:00 (120 phút), multiplier = 1.0, conversion = COMPENSATORY_LEAVE
 *      → effectiveOtMinutes = 120 * 1.0 = 120 phút
 *      → context.overtimeCompensatoryMinutes += 120 (cộng vào phép bù, không ảnh hưởng công ngày)
 * 
 * Trường hợp không có OT request:
 *   → context.overtimeMinutes = 0
 *   → context.overtimeCompensatoryMinutes = 0 (hoặc giữ giá trị cũ nếu có)
 * 
 * Lưu ý:
 *   - Chỉ lấy OT request có status 'approved'
 *   - Query trong khoảng 00:00 → 23:59:59 của ngày (Between startOfDay và endOfDay)
 *   - Nếu OT request overlap nhiều ngày → chỉ tính phần trong ngày này (có thể cần tinh chỉnh nếu OT cross-day)
 *   - Multiplier mặc định = 1.0 nếu conversion_type không có
 */