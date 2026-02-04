import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveBalanceTransaction } from './entities/leave-balance-transaction.entity';
import { LeaveRequestItem } from './entities/leave-request-item.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { OvertimeRequest } from './entities/overtime-request.entity';
import { TimesheetAdjustmentRequestItem } from './entities/timesheet-adjustment-request-item.entity';
import { TimesheetAdjustmentRequest } from './entities/timesheet-adjustment-request.entity';
import { WorkLocationRequestItem } from './entities/work-location-request-item.entity';
import { WorkLocationRequest } from './entities/work-location-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveBalanceTransaction,
      LeaveRequestItem,
      LeaveRequest,
      OvertimeRequest,                
      TimesheetAdjustmentRequestItem,
      TimesheetAdjustmentRequest,
      WorkLocationRequestItem,
      WorkLocationRequest,
    ]),
  ],
  providers: [
  ],
  exports: [
    TypeOrmModule,  
  ],
})
export class LeaveManagementModule {}