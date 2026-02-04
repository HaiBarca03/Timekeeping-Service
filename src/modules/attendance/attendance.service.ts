// src/modules/attendance/attendance.service.ts
import { Injectable } from '@nestjs/common';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';

@Injectable()
export class AttendanceService {
  constructor(private attendanceEngine: AttendanceEngine) {}

  async calculateDailyTimesheet(employeeId: string, date: Date): Promise<AttendanceDailyTimesheet> {
    return this.attendanceEngine.calculateDailyForEmployee(employeeId, date);
  }

  async calculateBatchDailyTimesheets(employeeIds: string[], date: Date): Promise<void> {
    for (const id of employeeIds) {
      try {
        await this.attendanceEngine.calculateDailyForEmployee(id, date);
      } catch (error) {
        console.error(`Error calculating for employee ${id}:`, error);
        // Có thể log hoặc throw tùy policy
      }
    }
  }
}