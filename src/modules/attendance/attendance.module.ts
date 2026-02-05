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
import { Employee } from '../master-data/entities/employee.entity'; // cần cho engine
import { AttendanceService } from './attendance.service';
import { AttendanceEngineModule } from './engine/attendance-engine.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from 'src/constants';

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
    BullModule.registerQueue({
      name: QUEUE_NAMES.ATTENDANCE,
    }),
  ],
  providers: [
    AttendanceService,
    AttendanceResolver,
  ],
})
export class AttendanceModule {}
