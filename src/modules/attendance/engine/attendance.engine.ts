import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftResolverService } from './services/shift-resolver.service';
import { PunchProcessingStrategy } from './strategies/punch-processing.strategy';
import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { LateEarlyStrategy } from './strategies/late-early.strategy';
import { OvertimeStrategy } from './strategies/overtime.strategy';
import { RemoteWorkStrategy } from './strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './strategies/workday-calculation.strategy';
import { CalculationContext } from './dto/calculation-context.dto';
import { AttendanceDailyTimesheet } from '../entities/attendance-daily-timesheet.entity';
import { AttendanceDailyPunch } from '../entities/attendance-daily-punch.entity';
import { Employee } from 'src/modules/master-data/entities/employee.entity';

@Injectable()
export class AttendanceEngine {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(AttendanceDailyPunch)
    private punchRepo: Repository<AttendanceDailyPunch>,

    private shiftResolver: ShiftResolverService,
    private punchStrategy: PunchProcessingStrategy,
    private breakStrategy: BreakTimeStrategy,
    private lateEarlyStrategy: LateEarlyStrategy,
    private overtimeStrategy: OvertimeStrategy,
    private remoteStrategy: RemoteWorkStrategy,
    private workdayStrategy: WorkdayCalculationStrategy,
  ) {}

  /**
   * Tính công ngày cho một nhân viên cụ thể
   * @param employeeId ID nhân viên
   * @param date Ngày tính công
   * @returns AttendanceDailyTimesheet đã tính xong (chưa save, caller có thể save)
   */
  async calculateDailyForEmployee(employeeId: string, date: Date): Promise<AttendanceDailyTimesheet> {
    // 1. Lấy thông tin nhân viên (với relations cần thiết)
    const employee = await this.getEmployee(employeeId);

    // 2. Tạo context chứa toàn bộ dữ liệu trung gian
    const context = new CalculationContext(employee, date);

    // 3. Lấy shift + rule + rest rules
    context.shiftContext = await this.shiftResolver.resolveShift(context);

    // 4. Chain các strategy theo thứ tự logic
    this.punchStrategy.process(context);                    // Xử lý punches đầu tiên
    this.breakStrategy.process(context);                    // Trừ break
    this.lateEarlyStrategy.process(context);                // Phạt trễ/sớm/miss
    await this.overtimeStrategy.process(context);           // OT request (async query)
    await this.remoteStrategy.process(context);             // Remote/online/công tác (async)
    this.workdayStrategy.process(context);                  // Tổng hợp finalActualWorkday

    // 5. Map context → entity & save (hoặc update) vào DB
    return this.saveOrUpdateTimesheet(context);
  }

  /**
   * Lấy employee với relations đầy đủ
   */
  private async getEmployee(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: [
        'company',
        'attendanceGroup',
        'attendanceGroup.defaultShift',
        'attendanceGroup.defaultShift.rule',
        'attendanceGroup.defaultShift.restRules',
        'attendanceGroup.defaultShift.fields',
        'attendanceMethod',
        'employeeType',
        // Thêm nếu cần: 'leavePolicy', 'jobLevel'...
      ],
    });

    if (!employee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  /**
   * Map dữ liệu từ context vào AttendanceDailyTimesheet & AttendanceDailyPunch
   * Save hoặc update vào DB
   */
  private async saveOrUpdateTimesheet(context: CalculationContext): Promise<AttendanceDailyTimesheet> {
    // Tìm timesheet hiện có (nếu đã tính trước đó) hoặc tạo mới
    let timesheet = context.dailyTimesheet ||
      await this.timesheetRepo.findOne({
        where: {
          employee_id: context.employee.id,
          attendance_date: context.date,
        },
      }) ||
      new AttendanceDailyTimesheet();

    // Map các field chính
    timesheet.company_id = context.companyId;
    timesheet.employee_id = context.employee.id;
    timesheet.attendance_date = context.date;
    timesheet.month = context.date.getMonth() + 1;
    timesheet.year = context.date.getFullYear();
    timesheet.total_workday = context.finalTotalWorkday;
    timesheet.actual_workday = context.finalActualWorkday;
    timesheet.online_value = context.onlineValue;
    timesheet.business_trip_value = context.businessTripValue;
    // Thêm các field aggregate nếu cần (ví dụ tổng late_hours từ punches)
    // ... thêm early_hours, overtime_minutes nếu entity hỗ trợ

    // Save timesheet trước để có ID
    timesheet = await this.timesheetRepo.save(timesheet);

    // Save hoặc update punches (gắn daily_timesheet_id)
    for (const punch of context.punches) {
      punch.daily_timesheet_id = timesheet.id;
      punch.daily_timesheet = timesheet; // optional relation

      // Nếu punch đã tồn tại (có id) → update, không thì insert mới
      if (punch.id) {
        await this.punchRepo.save(punch);
      } else {
        await this.punchRepo.save(punch);
      }
    }

    // Cập nhật lại context nếu cần
    context.dailyTimesheet = timesheet;

    return timesheet;
  }
}

/**
 * AttendanceEngine
 * 
 * Mục đích: 
 *   - Đây là **class điều phối chính** (orchestrator) cho toàn bộ quy trình tính công ngày
 *   - Nhận vào employeeId + date → thực hiện chain các strategy theo thứ tự logic
 *   - Cuối cùng map dữ liệu từ context vào AttendanceDailyTimesheet & AttendanceDailyPunch
 *   - Trả về entity AttendanceDailyTimesheet đã cập nhật (sẵn sàng save vào DB)
 * 
 * Input:
 *   - employeeId: ID nhân viên
 *   - date: Ngày tính công (Date object)
 * 
 * Output:
 *   - Promise<AttendanceDailyTimesheet>: Entity timesheet với actual_workday, total_workday, online_value... đã tính xong
 * 
 * Flow chi tiết (chain strategies theo thứ tự):
 * 
 * 1. getEmployee(employeeId) → Lấy thông tin nhân viên (company, shift group, type...)
 * 2. Tạo CalculationContext → container dữ liệu trung gian
 * 3. resolveShift → Lấy shift + rule + rest rules cho nhân viên
 * 4. Chain các strategy (theo thứ tự logic):
 *    - PunchProcessingStrategy: Xử lý raw punches → ghép cặp in/out, flag miss
 *    - BreakTimeStrategy: Trừ giờ nghỉ giữa ca → tính totalWorkedHours hiệu quả
 *    - LateEarlyStrategy: Tính trễ/sớm/miss → áp phạt latePenalty, earlyPenalty, missPenalty
 *    - OvertimeStrategy: Query & xử lý OT request → cộng overtimeMinutes (trả lương) hoặc compensatory (phép bù)
 *    - RemoteWorkStrategy: Query request remote/online/công tác → set onlineValue/businessTripValue, bỏ phạt miss nếu remote
 *    - WorkdayCalculationStrategy: Tổng hợp cuối → tính finalActualWorkday (công thực tế)
 * 5. saveOrUpdateTimesheet: Map context → entity + save (hoặc update) vào DB
 * 
 * Ví dụ minh họa flow:
 * 
 * Gọi: engine.calculateDailyForEmployee(123, new Date('2025-10-01'))
 * 
 * - Lấy employee ID 123
 * - Tạo context
 * - Lấy shift (ví dụ ca 8:00-17:00, nghỉ trưa 12:00-13:00)
 * - PunchProcessing: Query punches → có 1 cặp 08:15 → 17:10
 * - BreakTime: Trừ 60p nghỉ trưa → totalWorkedHours = 8
 * - LateEarly: Trễ 15p → latePenalty = 0.25
 * - Overtime: Có OT 120p multiplier 1.5 → overtimeMinutes = 180
 * - Remote: Không có request → onlineValue = 0
 * - WorkdayCalculation: 
 *   actual = 8/8 = 1
 *   trừ 0.25 → 0.75
 *   cộng OT 180/60/8 = 0.375 → finalActualWorkday ≈ 1.125
 * - Save: Tạo/update AttendanceDailyTimesheet với actual_workday = 1.125
 * 
 * Lưu ý:
 *   - Các strategy async (OT, Remote) dùng await để chờ query DB
 *   - saveOrUpdateTimesheet hiện là placeholder → cần inject repo và save thật
 *   - Nếu lỗi (không có employee, shift...) → throw error (có thể catch ở caller)
 *   - Có thể mở rộng: thêm HolidayStrategy (ngày lễ = 0 công), LeaveStrategy (trừ phép)
 */