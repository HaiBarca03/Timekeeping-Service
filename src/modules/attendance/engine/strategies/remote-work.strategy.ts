import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';

@Injectable()
export class RemoteWorkStrategy {
  private readonly logger = new Logger(RemoteWorkStrategy.name);

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

    const remoteRequest = await this.requestRepo
      .createQueryBuilder('request')
      .innerJoin('request.detail_time_off', 'detail')
      .select('detail.hours', 'hours')
      .where('request.employee_id = :employeeId', { employeeId: employee.id })
      .andWhere('request.type = :type', { type: RequestType.REMOTE })
      .andWhere('request.status = :status', { status: 'Approved' })
      .andWhere('request.is_counted = :isCounted', { isCounted: true })
      .andWhere(
        ':date BETWEEN CAST(detail.start_time AS DATE) AND CAST(detail.end_time AS DATE)',
        {
          date: date.toISOString().split('T')[0],
        },
      )
      .getRawOne();

    if (remoteRequest) {
      context.onlineValue = parseFloat(remoteRequest.hours) || 0;

      this.logger.debug(
        `Step Remote: Found ${context.onlineValue} hours for employee ${employee.id}`,
      );
    } else {
      context.onlineValue = 0;
    }
  }
}
