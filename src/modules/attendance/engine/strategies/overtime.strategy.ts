import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OvertimeRequest } from 'src/modules/leave-management/entities/overtime-request.entity';
import { CalculationContext } from '../dto/calculation-context.dto';
import { OvertimeConversionCode } from 'src/constants/overtime-conversion.enum';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class OvertimeStrategy {
  private readonly logger = new Logger(OvertimeStrategy.name);
  constructor(
    @InjectRepository(OvertimeRequest)
    private overtimeRepo: Repository<OvertimeRequest>,
  ) {}

  /**
   * Xử lý OT request cho ngày và cập nhật context
   */
  async process(context: CalculationContext): Promise<void> {
      const { id: employeeId } = context.employee;
      const { date } = context;

      // 1. Kiểm tra khoảng thời gian Query
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      this.logger.debug(
        `Query OT cho NV ${employeeId} từ ${startOfDay.toISOString()} đến ${endOfDay.toISOString()}`
      );

      const otRequests = await this.overtimeRepo.find({
        where: {
          requester_id: employeeId,
          status: 'approved',
          start_time: Between(startOfDay, endOfDay),
        },
        relations: ['conversion_type'],
      });

      // 2. Kiểm tra số lượng phiếu tìm thấy
      this.logger.log(`Tìm thấy ${otRequests.length} phiếu OT cho ngày ${date}`);

      let totalPaidOtMinutes = 0;
      let totalCompensatoryMinutes = 0;

      for (const request of otRequests) {
        // 3. Kiểm tra tính toán từng phiếu
        const otDurationMinutes = differenceInMinutes(
          new Date(request.end_time),
          new Date(request.start_time),
        );

        const multiplier = parseFloat(request.conversion_type?.multiplier as any) || 1.0;
        const effectiveOtMinutes = otDurationMinutes * multiplier;

        this.logger.debug(
          `Phiếu ID ${request.id}: Gốc ${otDurationMinutes}p, Hệ số ${multiplier}, Sau quy đổi ${effectiveOtMinutes}p (${request.conversion_type?.conversionName})`
        );

        if (request.conversion_type?.conversionName === OvertimeConversionCode.COMPENSATORY_LEAVE) {
          totalCompensatoryMinutes += effectiveOtMinutes;
        } else {
          totalPaidOtMinutes += effectiveOtMinutes;
        }
      }

      // 4. Kiểm tra giá trị cuối cùng ghi vào Context
      context.overtimeMinutes = (context.overtimeMinutes || 0) + totalPaidOtMinutes;
      context.overtimeCompensatoryMinutes = (context.overtimeCompensatoryMinutes || 0) + totalCompensatoryMinutes;
      
      this.logger.log(
        `Kết quả ngày ${date}: PaidOT=${context.overtimeMinutes}, CompOT=${context.overtimeCompensatoryMinutes}`
      );
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