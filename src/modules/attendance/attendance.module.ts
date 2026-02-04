// src/modules/attendance/attendance.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendanceResolver } from './graphql/resolvers/attendance.resolver';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from './entities/attendance-daily-punch.entity';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { AttendanceMonthSetting } from './entities/attendance-month-setting.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';
import { PunchProcessingStrategy } from './engine/strategies/punch-processing.strategy';
import { BreakTimeStrategy } from './engine/strategies/break-time.strategy';
import { LateEarlyStrategy } from './engine/strategies/late-early.strategy';
import { OvertimeStrategy } from './engine/strategies/overtime.strategy';
import { RemoteWorkStrategy } from './engine/strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './engine/strategies/workday-calculation.strategy';
import { ShiftResolverService } from './engine/services/shift-resolver.service';
import { RuleFactoryService } from './engine/services/rule-factory.service';
import { Employee } from '../master-data/entities/employee.entity'; // cần cho engine
import { AttendanceService } from './attendance.service';
import { AttendanceEngineModule } from './engine/attendance-engine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunchRecord,
      AttendanceDailyPunch,
      AttendanceDailyTimesheet,
      AttendanceMonthSetting,
      AttendanceMonthlyTimesheet,
      Employee,
    ]),
    AttendanceEngineModule,
  ],
  providers: [
    AttendanceService,
    AttendanceResolver,
  ],
})
export class AttendanceModule {}
