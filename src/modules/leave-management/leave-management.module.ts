import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OvertimeRequest } from './entities/overtime-request.entity';
import { TimesheetAdjustmentRequestItem } from './entities/timesheet-adjustment-request-item.entity';
import { TimesheetAdjustmentRequest } from './entities/timesheet-adjustment-request.entity';
import { LeaveManagementService } from './leave-management.service';
import { LeaveManagementController } from './leave-management.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceDailyTimesheet } from '../attendance/entities/attendance-daily-timesheet.entity';
import { BullModule } from '@nestjs/bullmq/dist/bull.module';
import { QUEUE_NAMES } from 'src/constants/queue.constants';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { RequestDetailOvertime } from './entities/request-detail-overtime.entity';
import { RequestDetailAdjustment } from './entities/request-detail-adjustment.entity';
import { AttendanceRequest } from './entities/attendance-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OvertimeRequest,
      TimesheetAdjustmentRequestItem,
      TimesheetAdjustmentRequest,
      Employee,
      AttendanceDailyTimesheet,
      AttendanceRequest,
      RequestDetailAdjustment,
      RequestDetailOvertime,
      RequestDetailTimeOff,
    ]),
    // BullModule.registerQueue({
    //   name: QUEUE_NAMES.ATTENDANCE,
    // }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CALCULATE_DAILY,
    }),
    forwardRef(() => AttendanceModule),
  ],
  controllers: [LeaveManagementController],
  providers: [LeaveManagementService],
  exports: [LeaveManagementService, TypeOrmModule],
})
export class LeaveManagementModule {}
