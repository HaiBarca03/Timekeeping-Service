import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';

@Injectable()
export class MaternityStrategy {
  private readonly logger = new Logger(MaternityStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    const { employee, date } = context;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

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

      context.isMaternityShift = true;

      context.attendanceGroupCode = employee.attendanceGroup.code;

      if (maternityRequest.detail_adjustment?.maternity_shift) {
        context['maternityShiftName'] =
          maternityRequest.detail_adjustment.maternity_shift;
      }
    } else {
      context.isMaternityShift = false;
    }
  }
}
