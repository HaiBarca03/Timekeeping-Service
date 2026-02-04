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

    // Khoảng thời gian trong ngày
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query request approved trong ngày
    const requests = await this.workLocationRepo.find({
      where: {
        requester_id: employeeId,
        status: 'approved',
        start_time: Between(startOfDay, endOfDay),
      },
      relations: ['request_type', 'items'],
    });

    let onlineValue = 0;
    let businessTripValue = 0;
    let isRemoteOrOnline = false;

    // Duyệt từng request
    for (const request of requests) {
      const typeCode = request.request_type?.typeName as RemoteRequestTypeCode;

      switch (typeCode) {
        case RemoteRequestTypeCode.WORK_FROM_HOME:      // Làm việc tại nhà (online)
        case RemoteRequestTypeCode.OUTSIDE_WORK:        // Ra ngoài làm việc
          onlineValue += 1.0; // Full ngày online/remote
          isRemoteOrOnline = true;
          break;

        case RemoteRequestTypeCode.BUSINESS_TRIP:       // Công tác
          businessTripValue += 1.0; // Full ngày công tác
          isRemoteOrOnline = true; // Có thể coi công tác tương tự remote về miss punch
          break;
      }

      // Nếu request có items liên kết cụ thể với daily timesheet
      // (ví dụ: request chỉ áp dụng cho 1/2 ngày)
      if (request.items?.length) {
        for (const item of request.items) {
          if (item.daily_timesheet_id === context.dailyTimesheet?.id) {
            // Có thể override giá trị chi tiết hơn ở đây
            // Ví dụ: item.value = 0.5 → onlineValue = 0.5 (nếu sau này hỗ trợ half-day remote)
          }
        }
      }
    }

    // Lưu giá trị vào context (sẽ dùng ở WorkdayCalculationStrategy)
    context.onlineValue = onlineValue;
    context.businessTripValue = businessTripValue;

    // Nếu có request remote/online/công tác → ưu tiên xử lý miss punch
    if (isRemoteOrOnline) {
      // Bỏ phạt miss check-in/out (vì làm remote không cần chấm công vật lý)
      context.missPenalty = 0;

      // Nếu toàn bộ miss punch (không có punch nào) → set giờ làm mặc định full ca
      // để tính công bình thường (thay vì 0)
      if (context.punches.every(p => p.miss_check_in && p.miss_check_out)) {
        context.totalWorkedHours = context.shiftContext?.getStandardWorkHours() || 8;
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