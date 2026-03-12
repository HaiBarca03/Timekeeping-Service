import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { ShiftContext } from '../dto/shift-context.dto';
import { CalculationContext } from '../dto/calculation-context.dto';
import { ShiftAssignment } from '../../entities/shift-assignment.entity';

@Injectable()
export class ShiftResolverService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,

    @InjectRepository(ShiftAssignment)
    private shiftAssignmentRepo: Repository<ShiftAssignment>
  ) {}

  async resolveShift(context: CalculationContext): Promise<ShiftContext> {
      const employee = context.employee;
      const groupCode = employee.attendanceGroup?.code;

      if (groupCode === 'STORE_GROUP') {
          return this.resolveStoreShifts(context);
      }

      if (groupCode === 'FACTORY_GROUP') {
        return this.resolveOfficeShift(context);
      }

      return this.resolveOfficeShift(context);
  }

  private async resolveOfficeShift(context: CalculationContext){
    let shift: Shift | null = null;

    if (context.employee.attendanceGroup?.defaultShiftId) {
      shift = await this.shiftRepo.findOne({
        where: { id: context.employee.attendanceGroup.defaultShiftId },
        relations: ['restRules'],
      });
    }

    if (!shift) {
      throw new Error(`No shift found for employee ${context.employee.id} on ${context.date}`);
    }

    return new ShiftContext(shift);
  }

  private async resolveStoreShifts(context: CalculationContext): Promise<ShiftContext> {

    const assignments = await this.shiftAssignmentRepo.find({
      where: {
        employeeId: context.employee.id,
        date: context.date,
        isActive: true
      },
      relations: ['shift', 'shift.restRules']
    });

    if (assignments.length === 0) {
      throw new Error(`No shift assignments for store employee`);
    }

    const shift = assignments[0].shift;

    return new ShiftContext(shift, assignments);
  }
}