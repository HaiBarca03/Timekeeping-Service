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

  async process(context: CalculationContext): Promise<void> {
      const { id: employeeId } = context.employee;
      const { date } = context;

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
          status: 'APPROVED',
          start_time: Between(startOfDay, endOfDay),
        },
        relations: ['conversion_type'],
      });

      this.logger.log(`Tìm thấy ${otRequests.length} phiếu OT cho ngày ${date}`);

      let totalPaidOtMinutes = 0;
      let totalCompensatoryMinutes = 0;

      for (const request of otRequests) {
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

      context.overtimeMinutes = (context.overtimeMinutes || 0) + totalPaidOtMinutes;
      context.overtimeCompensatoryMinutes = (context.overtimeCompensatoryMinutes || 0) + totalCompensatoryMinutes;
      
      this.logger.log(
        `Kết quả ngày ${date}: PaidOT=${context.overtimeMinutes}, CompOT=${context.overtimeCompensatoryMinutes}`
      );
  }
}
