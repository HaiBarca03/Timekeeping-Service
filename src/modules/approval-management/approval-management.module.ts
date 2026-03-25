import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalManagementService } from './approval-management.service';
import { ApprovalManagementController } from './approval-management.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceDailyTimesheet } from '../attendance/entities/attendance-daily-timesheet.entity';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { RequestDetailOvertime } from './entities/request-detail-overtime.entity';
import { RequestDetailAdjustment } from './entities/request-detail-adjustment.entity';
import { AttendanceRequest } from './entities/attendance-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      AttendanceDailyTimesheet,
      AttendanceRequest,
      RequestDetailAdjustment,
      RequestDetailOvertime,
      RequestDetailTimeOff,
    ]),
    forwardRef(() => AttendanceModule),
  ],
  controllers: [ApprovalManagementController],
  providers: [ApprovalManagementService],
  exports: [ApprovalManagementService, TypeOrmModule],
})
export class ApprovalManagementModule { }
