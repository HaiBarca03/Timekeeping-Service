import { Injectable, Logger } from '@nestjs/common';
import { LEAVE_TYPES } from 'src/constants/leave-type.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';
import { RequestStatus } from 'src/constants/req-status.contants';

@Injectable()
export class OvertimeStrategy {
  private readonly logger = new Logger(OvertimeStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    this.logger.debug(
      `[DEBUG] Effective AllowLate from Context: ${context['allowLateMinutes']}`,
    );
    this.logger.debug(
      `[DEBUG] AllowLate from Shift Rule: ${context.shiftContext?.rule?.allowLateMinutes}`,
    );
    const { employee, date } = context;

    // Quy tắc: Chỉ nhân viên mới tính OT, Quản lý (MGR, HEAD, DIR...) không tính.
    const jobLevelCode = employee.jobLevel?.code?.toUpperCase();
    const managementCodes = ['MGR', 'HEAD', 'DIR', 'CEO', 'MANAGER'];

    if (managementCodes.some((code) => jobLevelCode?.includes(code))) {
      this.logger.debug(
        `Skipping OT: Employee ${employee.id} is Management level (${jobLevelCode})`,
      );
      return;
    }

    const otRequest = await this.requestRepo
      .createQueryBuilder('request')
      .innerJoin('request.detail_overtime', 'detail')
      .select([
        'detail.hours_ratio as "hoursRatio"',
        'detail.ratio_convert as "ratio"',
        'detail.convert_type as "convertType"',
      ])
      .where('request.employee_id = :employeeId', { employeeId: employee.id })
      .andWhere('request.type = :type', { type: RequestType.OVERTIME })
      .andWhere('request.status = :status', { status: RequestStatus.APPROVED })
      .andWhere('request.is_counted = :isCounted', { isCounted: true })
      .andWhere('request.applied_date = :date', {
        date: date.toISOString().split('T')[0],
      })
      .getRawOne();

    if (!otRequest) return;

    // ĐIỀU KIỆN TỐI THIỂU 1 TIẾNG (Theo yêu cầu HM)
    const hours = parseFloat(otRequest.hoursRatio) || 0;

    if (hours < 1) {
      this.logger.warn(`OT Rejected: ${hours}h < 1h minimum requirement.`);
      return;
    }

    context.overtimeMinutes = hours * 60;

    if (otRequest.convertType === LEAVE_TYPES.COMPENSATORY_LEAVE) {
      context.overtimeCompensatoryMinutes = hours * 60;
    }

    context['ot_ratio'] = parseFloat(otRequest.ratio) || 1.0;

    this.logger.debug(`OT Approved: ${hours}h, Ratio: ${otRequest.ratio}`);
  }
}
