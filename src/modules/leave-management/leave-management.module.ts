import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequestItem } from './entities/leave-request-item.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { OvertimeRequest } from './entities/overtime-request.entity';
import { TimesheetAdjustmentRequestItem } from './entities/timesheet-adjustment-request-item.entity';
import { TimesheetAdjustmentRequest } from './entities/timesheet-adjustment-request.entity';
import { WorkLocationRequestItem } from './entities/work-location-request-item.entity';
import { WorkLocationRequest } from './entities/work-location-request.entity';
import { LeaveManagementService } from './leave-management.service';
import { LeaveManagementController } from './leave-management.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceDailyTimesheet } from '../attendance/entities/attendance-daily-timesheet.entity';
import { BullModule } from '@nestjs/bullmq/dist/bull.module';
import { QUEUE_NAMES } from 'src/constants/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRequestItem,
      LeaveRequest,
      OvertimeRequest,
      TimesheetAdjustmentRequestItem,
      TimesheetAdjustmentRequest,
      WorkLocationRequestItem,
      WorkLocationRequest,
      Employee,
      AttendanceDailyTimesheet,
    ]),
    BullModule.registerQueue({
      name: QUEUE_NAMES.ATTENDANCE,
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CALCULATE_DAILY,
    }),
    forwardRef(() => AttendanceModule),
  ],
  controllers: [LeaveManagementController], 
  providers: [LeaveManagementService],     
  exports: [
    LeaveManagementService, 
    TypeOrmModule,
  ],
})
export class LeaveManagementModule {}