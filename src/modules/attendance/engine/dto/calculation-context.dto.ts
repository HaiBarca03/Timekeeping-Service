import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { AttendanceDailyTimesheet } from '../../entities/attendance-daily-timesheet.entity';
import { AttendanceDailyPunch } from '../../entities/attendance-daily-punch.entity';
import { ShiftContext } from './shift-context.dto';

export class CalculationContext {
  employee: Employee;
  date: Date;
  companyId: string;
  companyName: string;
  attendanceGroupName?: string;

  punches: AttendanceDailyPunch[] = [];
  shiftContext?: ShiftContext;

  totalWorkedHours: number = 0;
  totalLateMinutes: number = 0;
  totalEarlyMinutes: number = 0;
  latePenalty: number = 0;          // số công bị trừ do trễ
  earlyPenalty: number = 0;
  missPenalty: number = 0;
  overtimeMinutes: number = 0;
  overtimeCompensatoryMinutes: number = 0;
  onlineValue: number = 0;
  businessTripValue: number = 0;

  finalActualWorkday: number = 0;
  finalTotalWorkday: number = 1;    // default 1 ngày

  dailyTimesheet?: AttendanceDailyTimesheet; // entity để save cuối cùng

  constructor(employee: Employee, date: Date) {
    this.employee = employee;
    this.date = date;
    this.companyId = employee.companyId;
    this.companyName = employee.company?.companyName || 'UNKNOWN';
    this.attendanceGroupName = employee.attendanceGroup?.groupName;
  }
}