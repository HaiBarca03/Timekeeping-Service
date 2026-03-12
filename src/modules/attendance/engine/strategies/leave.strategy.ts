import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LeaveRequestItem } from "src/modules/leave-management/entities/leave-request-item.entity";
import { CalculationContext } from "../dto/calculation-context.dto";

@Injectable()
export class LeaveStrategy {
  constructor(
    @InjectRepository(LeaveRequestItem)
    private leaveItemRepo: Repository<LeaveRequestItem>,
  ) {}

  async process(context: CalculationContext): Promise<void> {
    const leaveItems = await this.leaveItemRepo.find({
      where: {
        dailyTimesheet: {
          employee_id: context.employee.id,
          attendance_date: context.date
        },
        request: {
          status: 'APPROVED'
        }
      },
      relations: ['request', 'request.leave_type', 'dailyTimesheet']
    });

    if (leaveItems.length > 0) {
      const paidLeaveItems = leaveItems.filter(item => item.request.leave_type?.isDeductLeave === true);
      
      const unpaidLeaveItems = leaveItems.filter(item => item.request.leave_type?.isDeductLeave === false);

      context.leaveHours = paidLeaveItems.reduce((sum, item) => sum + Number(item.leave_minutes || 0) / 60, 0);
      context.leaveValue = paidLeaveItems.reduce((sum, item) => sum + Number(item.leave_value || 0), 0);
      
    } else {
      context.leaveHours = 0;
      context.leaveValue = 0;
    }
  }
}