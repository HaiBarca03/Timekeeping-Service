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
      const currentItem = request.items?.find(
        (item) => item.daily_timesheet_id === context.dailyTimesheet?.id
      );
      
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

    context.onlineValue = (context.onlineValue || 0) + onlineValue;
    context.businessTripValue = (context.businessTripValue || 0) + businessTripValue;

    if (isRemoteOrOnline) {
      context.missPenalty = 0;

      const noValidPunches = context.punches.every(p => p.miss_check_in && p.miss_check_out);
      
      if (noValidPunches) {
        const standardHours = context.shiftContext?.getStandardWorkHours() || 8;
        context.totalWorkedHours = standardHours * (onlineValue + businessTripValue);
      }
    }
  }
}