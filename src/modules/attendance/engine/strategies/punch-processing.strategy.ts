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

      // 1. Mở rộng khoảng query: Từ 00:00 ngày hiện tại đến 04:00 sáng ngày hôm sau
      // Điều này giúp "bắt" được các cú quẹt thẻ muộn hoặc lệch múi giờ như ID 11 trong ảnh
      const startRange = new Date(date);
      startRange.setHours(0, 0, 0, 0);

      const endRange = new Date(date);
      endRange.setDate(endRange.getDate() + 1); 
      endRange.setHours(4, 0, 0, 0); // Lấy thêm 4 tiếng ngày hôm sau

      const rawPunches = await this.punchRecordRepo.find({
        where: {
          employee_id: employeeId,
          punch_time: Between(startRange, endRange),
        },
        order: { punch_time: 'ASC' },
      });

      console.log(`[PunchDebug] Tìm thấy ${rawPunches.length} bản ghi trong khoảng mở rộng`);

      if (context.employee.attendanceMethod?.methodName === WorkMethodCode.NO_PUNCH_REQUIRED) {
        context.punches = [this.createFullDayPunch(context)];
        return;
      }

      if (rawPunches.length > 0) {
        const dailyPunch = new AttendanceDailyPunch();
        dailyPunch.punch_index = 1;
        
        // Bản ghi ID 10
        dailyPunch.check_in_time = rawPunches[0].punch_time;
        
        // Nếu tìm thấy bản ghi ID 11 (dù nó ghi là 00:28 ngày hôm sau)
        if (rawPunches.length >= 2) {
          dailyPunch.check_out_time = rawPunches[rawPunches.length - 1].punch_time;
          dailyPunch.miss_check_out = false;
        } else {
          dailyPunch.check_out_time = null;
          dailyPunch.miss_check_out = true;
        }

        dailyPunch.miss_check_in = false;
        context.punches = [dailyPunch];
      } else {
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