import { Injectable, Logger } from '@nestjs/common';
import { ATTENDANCE_GROUPS } from 'src/constants/attendance-group.constants';
import { LEAVE_TYPES } from 'src/constants/leave-type.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';
import { LeavePolicyRule } from '../../../master-data/entities/leave-policy-rule.entity';
import { LeaveType } from '../../../master-data/entities/leave-type.entity';
import { RequestStatus } from 'src/constants/approval-status.constants';

@Injectable()
export class LeaveStrategy {
  private readonly logger = new Logger(LeaveStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
    @InjectRepository(LeavePolicyRule)
    private policyRuleRepo: Repository<LeavePolicyRule>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    this.logger.debug(
      `[DEBUG] Effective AllowLate from Context: ${context['allowLateMinutes']}`,
    );
    this.logger.debug(
      `[DEBUG] AllowLate from Shift Rule: ${context.shiftContext?.rule?.allowLateMinutes}`,
    );
    const { employee, date, shiftContext } = context;
    const dateStr = date.toISOString().split('T')[0];

    const isOfficial = employee.employeeType?.code === 'OFFICIAL';

    this.logger.debug(`[LeaveStrategy] Checking for Emp ${employee.id} on ${dateStr}`);

    const leaveRequests = await this.requestRepo
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.leave_type', 'lt')
      .innerJoinAndSelect('request.detail_time_off', 'detail')
      .where('request.employee_id = :employeeId', { employeeId: employee.id })
      .andWhere('request.type = :type', { type: RequestType.LEAVE })
      .andWhere('request.status = :status', { status: RequestStatus.APPROVED })
      .andWhere('request.is_counted = :isCounted', { isCounted: true })
      .andWhere(
        ':dateStr BETWEEN CAST(detail.start_time AS DATE) AND CAST(detail.end_time AS DATE)',
        {
          dateStr,
        },
      )
      .getMany();

    if (!leaveRequests || leaveRequests.length === 0) return;

    let dayTotalLeaveHours = 0;
    let mainLeaveType: LeaveType | undefined = undefined;

    for (const req of leaveRequests) {
      const lt = req.leave_type;
      const detail = req.detail_time_off;
      const checkDate = new Date(dateStr);
      const startDate = new Date(
        new Date(detail.start_time).toISOString().split('T')[0],
      );

      const dayIndex =
        Math.floor(
          (checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      // --- RULE: ĐỐI TƯỢNG (SRS: Nhân viên chính thức của 4 công ty) ---
      if (!isOfficial && lt.code !== LEAVE_TYPES.UNPAID_LEAVE) {
        this.logger.warn(
          `NV ${employee.id} không phải chính thức, loại bỏ nghỉ có lương/chế độ.`,
        );
        continue;
      }

      // --- RULE: THAI SẢN (SRS: Nộp đơn tối thiểu 1 tháng trước ngày nghỉ) ---
      if (lt.code === LEAVE_TYPES.MATERNITY_LEAVE) {
        const appliedDate = new Date(req.applied_date);
        const createdAt = new Date(req['createdAt']); // BaseEntity cần có createdAt

        // Tính khoảng cách tháng 
        const diffDays =
          (appliedDate.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 30) {
          this.logger.error(
            `Đơn thai sản ${req.id} vi phạm quy tắc nộp trước 1 tháng (Chỉ nộp trước ${Math.floor(diffDays)} ngày)`,
          );
        }
      }

      // --- RULE: GIỚI HẠN NGÀY CHẾ ĐỘ ---
      let currentRequestHours = detail?.hours || 0;

      const policyLimits: Record<string, number> = {
        [LEAVE_TYPES.MARRIAGE_SELF]: 3, // Bản thân kết hôn
        [LEAVE_TYPES.MARRIAGE_CHILD]: 1, // Con cái kết hôn
        BEREAVEMENT: 3, // Nghỉ hiếu
        // Các loại như Vợ sinh, Thai sản, Du lịch: Không chặn tối đa theo SRS
      };

      if (policyLimits[lt.code] && dayIndex > policyLimits[lt.code]) {
        this.logger.warn(
          `Ngày nghỉ thứ ${dayIndex} của loại ${lt.code} vượt giới hạn cho phép. Không tính công.`,
        );
        currentRequestHours = 0;
      }

      // --- RULE: KHÔNG ỨNG TRƯỚC PHÉP (Deduct Leave) ---
      if (lt.isDeductLeave) {
        const rule = await this.policyRuleRepo.findOne({
          where: {
            policyId:
              (employee as any).leavePolicyId || employee.leavePolicy?.id,
            leaveTypeId: lt.id,
          },
        });

        // Nếu isDeductLeave = true mà quota <= 0 thì không tính công (không cho ứng trước)
        if (!rule || Number(rule.quotaDays) <= 0) {
          this.logger.error(
            `NV ${employee.id} hết quota cho loại ${lt.code}. Không tính công nghỉ.`,
          );
          currentRequestHours = 0;
        }
      }

      dayTotalLeaveHours += currentRequestHours;
      mainLeaveType = lt;
      context['leaveDayIndex'] = dayIndex;
    }

    // 3. LOGIC QUY ĐỔI THEO KHỐI (SRS: Tròn ca vs Tròn ngày)
    const standardHours = shiftContext?.getStandardWorkHours() || 8;

    if (dayTotalLeaveHours > 0 && mainLeaveType) {
      if (employee.attendanceGroup?.code === ATTENDANCE_GROUPS.STORE_GROUP_1 || employee.attendanceGroup?.code === ATTENDANCE_GROUPS.STORE_GROUP_2) {
        /**
         * SRS: Đối với Nhân viên Khối Cửa hàng: Nghỉ tròn ngày
         */
        context.leaveHours = standardHours;
        context.leaveValue = 1.0;
      } else {
        /**
         * SRS: Khối Xưởng và Văn phòng: nghỉ tròn ca (Sáng, Chiều)
         */
        const halfShift = standardHours / 2;
        if (dayTotalLeaveHours <= halfShift) {
          context.leaveHours = halfShift;
          context.leaveValue = 0.5;
        } else {
          context.leaveHours = standardHours;
          context.leaveValue = 1.0;
        }
      }

      context['leaveTypeCode'] = mainLeaveType.code;
      context['isPaidLeave'] = mainLeaveType.isDeductLeave;

      this.logger.debug(
        `Final Leave: ${context.leaveHours}h (${context.leaveValue} công) cho ${employee.id}`,
      );
    }
  }
}
