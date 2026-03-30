import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from './entities/attendance-daily-punch.entity';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { AttendanceMonthSetting } from './entities/attendance-month-setting.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceEngineModule } from './engine/attendance-engine.module';
import { AttendanceController } from './attendance.controller';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { BackdateOverride } from './entities/backdate_overrides.entity';
import { AttendanceCronService } from './attendance.cron';
import { Shift } from '../master-data/entities/shift.entity';
import { AttendanceGroup } from '../master-data/entities/attendance-group.entity';
import { Holiday } from './entities/holidays.entity';
import { Company } from '../master-data/entities/company.entity';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

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
      Shift,
      AttendanceGroup,
      Employee,
      Holiday,
      Company,
    ]),
    forwardRef(() => AttendanceEngineModule),
  ],
  controllers: [AttendanceController, CalendarController],
  providers: [AttendanceService, AttendanceCronService, CalendarService],
  exports: [AttendanceEngineModule, TypeOrmModule, AttendanceService, CalendarService],
})
export class AttendanceModule { }
