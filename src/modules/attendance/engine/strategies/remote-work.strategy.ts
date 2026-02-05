import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WorkLocationRequest } from 'src/modules/leave-management/entities/work-location-request.entity';
import { WorkLocationRequestItem } from 'src/modules/leave-management/entities/work-location-request-item.entity';
import { CalculationContext } from '../dto/calculation-context.dto';
import { RemoteRequestTypeCode } from 'src/constants/remote-request-type.enum';

@Injectable()
export class RemoteWorkStrategy {
  constructor(
    @InjectRepository(WorkLocationRequest)
    private workLocationRepo: Repository<WorkLocationRequest>,
    @InjectRepository(WorkLocationRequestItem)
    private workLocationItemRepo: Repository<WorkLocationRequestItem>,
  ) {}

  /**
   * Xử lý request remote/online/công tác và cập nhật context
   */
  async process(context: CalculationContext): Promise<void> {
    const employeeId = context.employee.id;
    const date = context.date;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const requests = await this.workLocationRepo.find({
      where: {
        requester_id: employeeId,
        status: 'approved',
        start_time: Between(startOfDay, endOfDay),
      },
      relations: ['request_type', 'items'],
    });

    if (!requests.length) return;

    let onlineValue = 0;
    let businessTripValue = 0;
    let isRemoteOrOnline = false;

    for (const request of requests) {
      const typeCode = request.request_type?.typeName as RemoteRequestTypeCode;

      // Tìm weight (trọng số công) từ items của phiếu ngày hôm nay
      // Nếu bạn thêm cột 'value' (0.5 hoặc 1) vào WorkLocationRequestItem thì lấy ở đây
      const currentItem = request.items?.find(
        (item) => item.daily_timesheet_id === context.dailyTimesheet?.id
      );
      
      // Mặc định là 1.0 nếu không tìm thấy item cụ thể hoặc item không có value
      const weight = (currentItem as any)?.value || 1.0;

      switch (typeCode) {
        case RemoteRequestTypeCode.WORK_FROM_HOME:
        case RemoteRequestTypeCode.OUTSIDE_WORK:
          onlineValue += weight;
          isRemoteOrOnline = true;
          break;

        case RemoteRequestTypeCode.BUSINESS_TRIP:
          businessTripValue += weight;
          isRemoteOrOnline = true;
          break;
      }
    }

    // Cập nhật context (Dùng += để tránh ghi đè nếu có strategy khác chạy trước)
    context.onlineValue = (context.onlineValue || 0) + onlineValue;
    context.businessTripValue = (context.businessTripValue || 0) + businessTripValue;

    if (isRemoteOrOnline) {
      // 1. Miễn trừ phạt quên quẹt (Miss Punch)
      context.missPenalty = 0;

      // 2. Xử lý giờ làm nếu không có punch thực tế
      // Dùng check: Nếu không có bất kỳ lần quẹt thẻ hợp lệ nào
      const noValidPunches = context.punches.every(p => p.miss_check_in && p.miss_check_out);
      
      if (noValidPunches) {
        const standardHours = context.shiftContext?.getStandardWorkHours() || 8;
        // Giờ làm = Giờ chuẩn * tổng trọng số (ví dụ 8h * 0.5 = 4h)
        context.totalWorkedHours = standardHours * (onlineValue + businessTripValue);
      }
    }
  }
}

/**
 * RemoteWorkStrategy
 * 
 * Mục đích: 
 *   - Xử lý các yêu cầu làm việc từ xa / công tác / online (WorkLocationRequest) đã approved cho ngày tính công
 *   - Set các giá trị đặc biệt trong daily timesheet: online_value, business_trip_value
 *   - Nếu là remote/online → giảm hoặc bỏ phạt miss punch (vì không cần chấm công vật lý)
 *   - Nếu toàn bộ miss punch nhưng có request remote/online → set giờ làm mặc định (full ca) để tính công
 * 
 * Input (qua context):
 *   - context.employee.id: ID nhân viên để query request
 *   - context.date: Ngày tính công (lọc request trong ngày)
 *   - context.punches: Danh sách punch (để check miss in/out)
 *   - context.shiftContext: Để lấy giờ chuẩn ca (standard hours) nếu cần default
 *   - context.dailyTimesheet?.id: (nếu đã có) để match với request items
 * 
 * Output: Không return gì (void), chỉ cập nhật context:
 *   - context.onlineValue: Giá trị online/remote (thường 1.0 = full ngày)
 *   - context.businessTripValue: Giá trị công tác (thường 1.0 = full ngày)
 *   - context.missPenalty: Có thể set = 0 nếu remote/online (bỏ phạt miss)
 *   - context.totalWorkedHours: Có thể set mặc định full ca nếu miss hoàn toàn nhưng có request
 * 
 * Ví dụ minh họa:
 * 
 * 1. Có request WORK_FROM_HOME approved cho cả ngày
 *    - typeCode = WORK_FROM_HOME
 *    - onlineValue += 1.0
 *    - isRemoteOrOnline = true
 *    → Nếu miss punch hoàn toàn → set totalWorkedHours = 8 (hoặc giờ chuẩn ca)
 *    → missPenalty = 0 (không phạt quên chấm công vì làm remote)
 * 
 * 2. Có request BUSINESS_TRIP approved
 *    - typeCode = BUSINESS_TRIP
 *    - businessTripValue += 1.0
 *    → Công tác → coi như full ngày, có thể bỏ miss penalty
 * 
 * 3. Không có request nào
 *    - onlineValue = 0
 *    - businessTripValue = 0
 *    - isRemoteOrOnline = false → giữ nguyên missPenalty (phạt miss punch bình thường)
 * 
 * 4. Có request OUTSIDE_WORK (ra ngoài làm việc)
 *    - onlineValue += 1.0 (tương tự WFH)
 * 
 * Lưu ý:
 *   - Chỉ lấy request approved trong ngày (00:00 → 23:59)
 *   - Nếu request có items liên kết daily_timesheet → có thể override giá trị chi tiết hơn (hiện tại để trống, sau mở rộng)
 *   - Logic "bỏ phạt miss" và "set full giờ" là để hỗ trợ làm remote/online (không cần máy chấm công)
 *   - Có thể tinh chỉnh: nếu remote nhưng vẫn có punch → giữ nguyên punch, chỉ set value 1.0
 */