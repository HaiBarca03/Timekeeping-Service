import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AttendancePunchRecord } from '../../entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from '../../entities/attendance-daily-punch.entity';
import { CalculationContext } from '../dto/calculation-context.dto';
import { WorkMethodCode } from 'src/constants/work-method.enum'; 

@Injectable()
export class PunchProcessingStrategy {

  private readonly logger = new Logger(PunchProcessingStrategy.name);

  constructor(
    @InjectRepository(AttendancePunchRecord)
    private punchRecordRepo: Repository<AttendancePunchRecord>,
  ) {}

  async process(context: CalculationContext): Promise<void> {

    this.logger.log('========== START PunchProcessingStrategy ==========');

    const employeeId = context.employee.id;
    const date = context.date;

    this.logger.debug(`EmployeeId: ${employeeId}`);
    this.logger.debug(`Date: ${date}`);

    const startRange = new Date(date);
    startRange.setHours(0, 0, 0, 0);

    const endRange = new Date(date);
    endRange.setDate(endRange.getDate() + 1);
    endRange.setHours(4, 0, 0, 0);

    this.logger.debug(`Punch query range:`);
    this.logger.debug(`StartRange: ${startRange.toISOString()}`);
    this.logger.debug(`EndRange: ${endRange.toISOString()}`);

    const rawPunches = await this.punchRecordRepo.find({
      where: {
        employee_id: employeeId,
        punch_time: Between(startRange, endRange),
      },
      order: { punch_time: 'ASC' },
    });

    this.logger.debug(`RAW PUNCH COUNT: ${rawPunches.length}`);
    // this.logger.debug(`RAW PUNCH DATA: ${JSON.stringify(rawPunches)}`);

    // ===== NO PUNCH REQUIRED =====
    if (
      context.employee.attendanceMethod?.methodName ===
      WorkMethodCode.NO_PUNCH_REQUIRED
    ) {

      this.logger.debug(`Work method = NO_PUNCH_REQUIRED → create full day punch`);

      context.punches = [this.createFullDayPunch(context)];

      // this.logger.debug(`Generated Punch: ${JSON.stringify(context.punches)}`);

      return;
    }

    // ===== NO PUNCH RECORD =====
    if (rawPunches.length === 0) {

      this.logger.warn(`No punch record found → mark miss check-in/out`);

      const missPunch = new AttendanceDailyPunch();

      missPunch.punch_index = 1;
      missPunch.miss_check_in = true;
      missPunch.miss_check_out = true;

      missPunch.check_in_result = 'Lack';
      missPunch.check_out_result = 'Lack';

      context.punches = [missPunch];

      this.logger.debug(`Generated Missing Punch: ${JSON.stringify(missPunch)}`);

      return;
    }

    const dailyPunch = new AttendanceDailyPunch();
    dailyPunch.punch_index = 1;

    // ===== CHECK-IN =====
    dailyPunch.check_in_time = rawPunches[0].punch_time;

    this.logger.debug(
      `Selected Check-in (first punch): ${dailyPunch.check_in_time}`,
    );

    dailyPunch.miss_check_in = false;
    dailyPunch.check_in_result = 'Normal';

    // ===== CHECK-OUT =====
    if (rawPunches.length >= 2) {

      dailyPunch.check_out_time =
        rawPunches[rawPunches.length - 1].punch_time;

      this.logger.debug(
        `Selected Check-out (last punch): ${dailyPunch.check_out_time}`,
      );

      dailyPunch.miss_check_out = false;
      dailyPunch.check_out_result = 'Normal';

    } else {

      this.logger.warn(`Only 1 punch → missing check-out`);

      dailyPunch.check_out_time = null;
      dailyPunch.miss_check_out = true;
      dailyPunch.check_out_result = 'Lack';
    }

    context.punches = [dailyPunch];

    // this.logger.debug(
    //   `DAILY PUNCH RESULT: ${JSON.stringify(context.punches)}`,
    // );

    this.logger.log('========== END PunchProcessingStrategy ==========');
  }

  private createFullDayPunch(context: CalculationContext): AttendanceDailyPunch {

    this.logger.debug(`createFullDayPunch called`);

    const punch = new AttendanceDailyPunch();

    punch.punch_index = 1;

    punch.miss_check_in = false;
    punch.miss_check_out = false;

    punch.check_in_result = 'Normal';
    punch.check_out_result = 'Normal';

    const rule = context.shiftContext?.rule;

    if (rule) {

      this.logger.debug(`Shift rule detected`);

      const onTime =
        rule.onTime instanceof Date
          ? rule.onTime
          : this.combineDateAndTime(context.date, rule.onTime);

      const offTime =
        rule.offTime instanceof Date
          ? rule.offTime
          : this.combineDateAndTime(context.date, rule.offTime);

      this.logger.debug(`Generated onTime: ${onTime}`);
      this.logger.debug(`Generated offTime: ${offTime}`);

      punch.check_in_time = onTime;
      punch.check_out_time = offTime;
    }

    return punch;
  }

  private combineDateAndTime(date: Date, timeStr: string): Date {

    const [hours, minutes] = timeStr.split(':').map(Number);

    const dt = new Date(date);
    dt.setHours(hours, minutes, 0, 0);

    this.logger.debug(`combineDateAndTime ${timeStr} → ${dt.toISOString()}`);

    return dt;
  }

  async getRawPunches(
    context: CalculationContext,
  ): Promise<AttendancePunchRecord[]> {

    this.logger.debug(`getRawPunches called`);

    const employeeId = context.employee.id;
    const date = context.date;

    const startRange = new Date(date);
    startRange.setHours(0, 0, 0, 0);

    const endRange = new Date(date);
    endRange.setDate(endRange.getDate() + 1);
    endRange.setHours(4, 0, 0, 0);

    this.logger.debug(`Querying punches again for debug`);

    return await this.punchRecordRepo.find({
      where: {
        employee_id: employeeId,
        punch_time: Between(startRange, endRange),
      },
      order: { punch_time: 'ASC' },
    });
  }
}