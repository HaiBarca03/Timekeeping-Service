import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEngine } from './attendance.engine';
import { AttendancePunchRecord } from '../entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from '../entities/attendance-daily-punch.entity';
import { AttendanceDailyTimesheet } from '../entities/attendance-daily-timesheet.entity';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { PunchProcessingStrategy } from './strategies/punch-processing.strategy';
import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { LateEarlyStrategy } from './strategies/late-early.strategy';
import { OvertimeStrategy } from './strategies/overtime.strategy';
import { RemoteWorkStrategy } from './strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './strategies/workday-calculation.strategy';
import { ShiftResolverService } from './services/shift-resolver.service';
import { RuleFactoryService } from './services/rule-factory.service';
import { OvertimeRequest } from 'src/modules/leave-management/entities/overtime-request.entity';
import { WorkLocationRequestItem } from 'src/modules/leave-management/entities/work-location-request-item.entity';
import { WorkLocationRequest } from 'src/modules/leave-management/entities/work-location-request.entity';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { LeaveManagementModule } from 'src/modules/leave-management/leave-management.module';
import { AttendanceMethod } from 'src/modules/master-data/entities/attendance-method.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunchRecord,
      AttendanceDailyPunch,
      AttendanceMethod,
      AttendanceDailyTimesheet,
      Employee,
      OvertimeRequest,
      WorkLocationRequest,
      WorkLocationRequestItem,
      Shift,
    ]),
    LeaveManagementModule,
  ],
  providers: [
    AttendanceEngine,
    PunchProcessingStrategy,
    BreakTimeStrategy,
    LateEarlyStrategy,
    OvertimeStrategy,
    RemoteWorkStrategy,
    WorkdayCalculationStrategy,
    ShiftResolverService,
    RuleFactoryService,
  ],
  exports: [AttendanceEngine],
})
export class AttendanceEngineModule {}