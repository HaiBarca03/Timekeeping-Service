import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../leave-management/entities/attendance-request.entity';

@Injectable()
export class MaternityStrategy {
  private readonly logger = new Logger(MaternityStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) {}

  async process(context: CalculationContext): Promise<void> {
    const { employee, date } = context;

    // Tạo mốc thời gian chỉ có ngày (không có giờ) để so sánh chính xác
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // 1. Tìm đơn MATERNITY đã Approved
    // Điều kiện: Ngày đang tính phải nằm trong khoảng [maternity_start_date, maternity_end_date]
    const maternityRequest = await this.requestRepo
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.detail_adjustment', 'detail')
      .where('request.employee_id = :employeeId', { employeeId: employee.id })
      .andWhere('request.type = :type', { type: RequestType.MATERNITY })
      .andWhere('request.status = :status', { status: 'Approved' })
      .andWhere('detail.maternity_start_date <= :date', { date: checkDate })
      .andWhere('detail.maternity_end_date >= :date', { date: checkDate })
      .getOne();

    if (maternityRequest) {
      this.logger.log(
        `[MATERNITY] Employee ${employee.id} is on Maternity mode on ${checkDate.toDateString()}`,
      );

      // 2. Cập nhật Context
      context.isMaternityShift = true;

      // Gán thêm thông tin group code từ employee để hàm getStandardWorkHours trong ShiftContext chạy đúng
      context.attendanceGroupCode = employee.attendanceGroup.code;

      // Nếu cần lưu vết ca thai sản cụ thể từ đơn
      if (maternityRequest.detail_adjustment?.maternity_shift) {
        context['maternityShiftName'] =
          maternityRequest.detail_adjustment.maternity_shift;
      }
    } else {
      context.isMaternityShift = false;
    }
  }
}
