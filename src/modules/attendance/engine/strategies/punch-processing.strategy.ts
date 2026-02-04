import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AttendancePunchRecord } from '../../entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from '../../entities/attendance-daily-punch.entity';
import { CalculationContext } from '../dto/calculation-context.dto';
import { WorkMethodCode } from 'src/constants/work-method.enum'; // giả sử bạn có enum này

@Injectable()
export class PunchProcessingStrategy {
  constructor(
    @InjectRepository(AttendancePunchRecord)
    private punchRecordRepo: Repository<AttendancePunchRecord>,

    @InjectRepository(AttendanceDailyPunch)
    private dailyPunchRepo: Repository<AttendanceDailyPunch>,
  ) {}

  async process(context: CalculationContext): Promise<void> {
    const employeeId = context.employee.id;
    const date = context.date;

    // Xác định khoảng thời gian trong ngày (00:00 đến 23:59:59)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy tất cả punch records trong ngày
    const rawPunches = await this.punchRecordRepo.find({
      where: {
        employee_id: employeeId,
        punch_time: Between(startOfDay, endOfDay),
      },
      order: { punch_time: 'ASC' },
    });

    // Nếu phương thức chấm công là NONE → không cần punch, coi như full day
    const workMethod = context.employee.attendanceMethod?.methodName as WorkMethodCode;
    if (workMethod === WorkMethodCode.NO_PUNCH_REQUIRED) {
      context.punches = [this.createFullDayPunch(context)];
      return;
    }

    // Xử lý ghép cặp (giả sử luân phiên: 1=in, 2=out, 3=in, ...)
    const dailyPunches: AttendanceDailyPunch[] = [];
    let pairIndex = 1;

    for (let i = 0; i < rawPunches.length; i += 2) {
      const punchIn = rawPunches[i];
      const punchOut = rawPunches[i + 1];

      const dailyPunch = new AttendanceDailyPunch();
      dailyPunch.daily_timesheet_id = context.dailyTimesheet?.id || null;
      dailyPunch.punch_index = pairIndex++;
      dailyPunch.check_in_time = punchIn?.punch_time || null;
      dailyPunch.check_out_time = punchOut?.punch_time || null;

      // Flag miss
      dailyPunch.miss_check_in = !dailyPunch.check_in_time;
      dailyPunch.miss_check_out = !dailyPunch.check_out_time;

      // Lưu kết quả xử lý punch (check_in_result, check_out_result) nếu cần
      dailyPunch.check_in_result = punchIn?.punch_result;
      dailyPunch.check_out_result = punchOut?.punch_result;

      dailyPunches.push(dailyPunch);
    }

    // Nếu số punch lẻ (chỉ có check-in cuối cùng) → miss check-out
    if (rawPunches.length % 2 === 1) {
      const lastPunch = dailyPunches[dailyPunches.length - 1];
      lastPunch.miss_check_out = true;
    }

    context.punches = dailyPunches;

    // Optional: nếu miss hoàn toàn → tạo punch giả với miss flag
    if (dailyPunches.length === 0) {
      const missPunch = new AttendanceDailyPunch();
      missPunch.punch_index = 1;
      missPunch.miss_check_in = true;
      missPunch.miss_check_out = true;
      context.punches = [missPunch];
    }
  }

  private createFullDayPunch(context: CalculationContext): AttendanceDailyPunch {
    const punch = new AttendanceDailyPunch();
    punch.punch_index = 1;
    punch.miss_check_in = false;
    punch.miss_check_out = false;
    // Có thể set check_in/out theo shift nếu muốn
    if (context.shiftContext?.rule) {
      punch.check_in_time = this.combineDateAndTime(context.date, context.shiftContext.rule.onTime!);
      punch.check_out_time = this.combineDateAndTime(context.date, context.shiftContext.rule.offTime!);
    }
    return punch;
  }

  private combineDateAndTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  }
}