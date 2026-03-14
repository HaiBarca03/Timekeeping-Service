import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEngine } from './attendance.engine';
import { AttendancePunchRecord } from '../entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from '../entities/attendance-daily-punch.entity';
import { AttendanceDailyTimesheet } from '../entities/attendance-daily-timesheet.entity';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { PunchProcessingStrategy } from './strategies/punch-processing.strategy';
// import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { LateEarlyStrategy } from './strategies/late-early.strategy';
import { OvertimeStrategy } from './strategies/overtime.strategy';
import { RemoteWorkStrategy } from './strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './strategies/workday-calculation.strategy';
import { ShiftResolverService } from './services/shift-resolver.service';
import { RuleFactoryService } from './services/rule-factory.service';
import { OvertimeRequest } from 'src/modules/leave-management/entities/overtime-request.entity';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { LeaveManagementModule } from 'src/modules/leave-management/leave-management.module';
import { AttendanceMethod } from 'src/modules/master-data/entities/attendance-method.entity';
import { AttendanceRecordService } from './services/attendance-record.service';
import { LeaveStrategy } from './strategies/leave.strategy';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { StorePunchStrategy } from './strategies/store-punch.strategy';
import { Holiday } from '../entities/holidays.entity';
import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { LeavePolicyRule } from 'src/modules/master-data/entities/leave-policy-rule.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunchRecord,
      AttendanceDailyPunch,
      AttendanceMethod,
      AttendanceDailyTimesheet,
      Employee,
      Holiday,
      ShiftAssignment,
      OvertimeRequest,
      LeavePolicyRule,
      Shift
    ]),
    forwardRef(() => LeaveManagementModule),
  ],
  providers: [
    AttendanceEngine,
    PunchProcessingStrategy,
    BreakTimeStrategy,
    LateEarlyStrategy,
    OvertimeStrategy,
    LeaveStrategy,
    RemoteWorkStrategy,
    StorePunchStrategy,
    WorkdayCalculationStrategy,
    ShiftResolverService,
    RuleFactoryService,
    AttendanceRecordService
  ],
  exports: [
    AttendanceEngine, 
    AttendanceRecordService
  ],
})
export class AttendanceEngineModule {}