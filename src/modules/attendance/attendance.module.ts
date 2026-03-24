// src/modules/attendance/attendance.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from './entities/attendance-daily-punch.entity';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { AttendanceMonthSetting } from './entities/attendance-month-setting.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceEngineModule } from './engine/attendance-engine.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from 'src/constants';
import { AttendanceController } from './attendance.controller';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { BackdateOverride } from './entities/backdate_overrides.entity';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunchRecord,
      AttendanceDailyPunch,
      AttendanceDailyTimesheet,
      AttendanceMonthSetting,
      AttendanceMonthlyTimesheet,
      ShiftAssignment,
      BackdateOverride,
      Employee,
    ]),
    RedisModule,
    forwardRef(() => AttendanceEngineModule),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CALCULATE_DAILY,
    }),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceEngineModule, TypeOrmModule, AttendanceService],
})
export class AttendanceModule {}
