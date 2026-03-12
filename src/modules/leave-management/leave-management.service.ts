import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveRequestItem } from './entities/leave-request-item.entity';
import { AttendanceEngine } from '../attendance/engine/attendance.engine';
import { AttendanceDailyTimesheet } from '../attendance/entities/attendance-daily-timesheet.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants/queue.constants';
import { ImportLeaveDto } from './dto/import-leave.dto';

@Injectable()
export class LeaveManagementService {
  private readonly logger = new Logger(LeaveManagementService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestRepo: Repository<LeaveRequest>,

    @InjectRepository(LeaveRequestItem)
    private leaveItemRepo: Repository<LeaveRequestItem>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    
    private attendanceEngine: AttendanceEngine,

    @InjectQueue(QUEUE_NAMES.CALCULATE_DAILY) 
    private attendanceQueue: Queue,
  ) {}

  async processBulkLeaves(leaveDataArray: ImportLeaveDto[]) {
    const recalculateMap = new Map<string, Set<string>>();
    console.log('>>> [START] Nhận danh sách import:', leaveDataArray.length, 'phiếu');

  for (const data of leaveDataArray) {
      const employee = await this.employeeRepo.findOne({
        where: { userId: data.userId, companyId: data.company_id }
      });

      if (!employee) {
        this.logger.error(`Không tìm thấy nhân viên: ${data.userId}`);
        continue;
      }

      let finalLeaveTypeId = data.leave_type_id;

      const leaveEntity = this.leaveRequestRepo.create({
        ...data,
        leave_type_id: finalLeaveTypeId,
        employee_id: employee.id,
        requester_id: employee.id,
        status: 'APPROVED',
        submitted_at: new Date(),
        approved_at: new Date(),
      } as Partial<LeaveRequest>);

      const savedLeave = await this.leaveRequestRepo.save(leaveEntity);

      const items = await this.createLeaveItems(savedLeave);
      const empId = savedLeave.employee_id;
      if (!recalculateMap.has(empId)) recalculateMap.set(empId, new Set<string>());

      for (const item of items) {
        const timesheet = await this.timesheetRepo.findOne({ where: { id: item.daily_timesheet_id } });
        if (timesheet) {
          recalculateMap.get(empId)!.add(new Date(timesheet.attendance_date).toISOString().split('T')[0]);
        }
      }
    }

    const jobs: any[] = []; 
    for (const [employeeId, dates] of recalculateMap.entries()) {
      for (const dateStr of dates) {
        console.log(`[QUEUE] Chuẩn bị job tính lại: Emp=${employeeId}, Date=${dateStr}`);
        jobs.push({
          name: JOB_NAMES.CALCULATE_DAILY, 
          data: { employee_id: employeeId, date: dateStr },
          opts: {
            attempts: 3,
            removeOnComplete: true,
            jobId: `calc-${employeeId}-${dateStr}-${Date.now()}`, 
          },
        });
      }
    }

    if (jobs.length > 0) {
      await this.attendanceQueue.addBulk(jobs);
      this.logger.log(`🚀 Đã bắn ${jobs.length} jobs vào BullMQ.`);
    }

    return { success: true, count: leaveDataArray.length };
  }

  private async createLeaveItems(leave: LeaveRequest): Promise<LeaveRequestItem[]> {
    const start = new Date(leave.start_time);
    start.setHours(0, 0, 0, 0);
    const end = new Date(leave.end_time);
    end.setHours(23, 59, 59, 999);

    const relatedTimesheets = await this.timesheetRepo.find({
      where: { 
        employee_id: leave.employee_id, 
        attendance_date: Between(start, end) 
      }
    });

    if (relatedTimesheets.length === 0) return [];

    const itemsToSave = relatedTimesheets.map(ts => {
      const hoursForThisDay = relatedTimesheets.length === 1 ? Number(leave.leave_hours) : 8;

      return this.leaveItemRepo.create({
        request_id: leave.id,
        daily_timesheet_id: ts.id,
        leave_value: hoursForThisDay / 8, 
        leave_minutes: hoursForThisDay * 60,
      });
    });

    return (await this.leaveItemRepo.save(itemsToSave)) as LeaveRequestItem[];
  }
}