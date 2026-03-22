import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../leave-management/entities/attendance-request.entity';
import { ShiftContext } from '../dto/shift-context.dto';
import { ShiftAssignment } from '../../entities/shift-assignment.entity';

@Injectable()
export class SwapStrategy {
  private readonly logger = new Logger(SwapStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
    @InjectRepository(ShiftAssignment)
    private assignmentRepo: Repository<ShiftAssignment>,
  ) {}

  async process(context: CalculationContext): Promise<void> {
    const { employee, date } = context;
    const groupCode = employee.attendanceGroup?.code;

    // 1. CHỈ ÁP DỤNG CHO KHỐI CỬA HÀNG
    if (groupCode !== 'STORE_GROUP') return;

    const dateString = date.toISOString().split('T')[0];

    // 2. TÌM ĐƠN SWAP (Kiểm tra cả 2 chiều: mình là người mời hoặc người được mời)
    const swapRequest = await this.requestRepo.findOne({
      where: [
        {
          employee_id: employee.id,
          applied_date: dateString as any,
          type: RequestType.SWAP,
          status: 'Approved',
          is_counted: true,
        },
        {
          detail_adjustment: { employee_id_swap: employee.id },
          applied_date: dateString as any,
          type: RequestType.SWAP,
          status: 'Approved',
          is_counted: true,
        },
      ],
      relations: ['detail_adjustment'],
    });

    if (!swapRequest) return;

    const detail = swapRequest.detail_adjustment;

    // Xác định ID của người "đối tác" trong đơn đổi ca
    const partnerId =
      swapRequest.employee_id === employee.id
        ? detail.employee_id_swap
        : swapRequest.employee_id;

    this.logger.log(
      `[SWAP-STORE] Swapping context: ${employee.id} <-> ${partnerId} on ${dateString}`,
    );

    // 3. LẤY TOÀN BỘ ASSIGNMENTS CỦA NGƯỜI KIA
    const partnerAssignments = await this.assignmentRepo.find({
      where: {
        employeeId: partnerId, // Lưu ý: Check lại tên field trong Entity của ông (employeeId hay employee_id)
        date: dateString as any,
        isActive: true,
      },
      relations: ['shift', 'shift.restRule'],
    });

    if (partnerAssignments.length > 0) {
      // 4. HOÁN ĐỔI SHIFT CONTEXT
      // Tạo một ShiftContext mới dựa trên Assignments của Partner
      const partnerShift = partnerAssignments[0].shift;
      const newShiftContext = new ShiftContext(
        partnerShift,
        partnerAssignments,
      );

      // Ghi đè vào context đang tính toán của Employee hiện tại
      context.shiftContext = newShiftContext;

      // Đánh dấu để các strategy sau biết đây là ca được đổi
      context['isSwapped'] = true;
      context['originalPartnerId'] = partnerId;

      this.logger.debug(
        `[SWAP-STORE] Applied partner's ${partnerAssignments.length} assignments to current employee.`,
      );
    } else {
      // Nếu người kia không có ca, thì ngày này coi như không có ca để đổi
      this.logger.warn(
        `[SWAP-STORE] Partner ${partnerId} has no assignments to swap.`,
      );
      context.shiftContext = new ShiftContext(); // Trả về context trống
    }
  }
}
