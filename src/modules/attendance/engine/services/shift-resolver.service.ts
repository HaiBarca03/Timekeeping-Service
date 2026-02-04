import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { ShiftContext } from '../dto/shift-context.dto';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class ShiftResolverService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
  ) {}

  async resolveShift(context: CalculationContext): Promise<ShiftContext> {
    let shift: Shift | null = null;

    // Ưu tiên 1: shift từ attendance group của employee
    if (context.employee.attendanceGroup?.defaultShiftId) {
      shift = await this.shiftRepo.findOne({
        where: { id: context.employee.attendanceGroup.defaultShiftId },
        relations: ['rule', 'restRules', 'fields'],
      });
    }

    // Nếu vẫn không có → throw hoặc dùng shift mặc định 8h
    if (!shift) {
      throw new Error(`No shift found for employee ${context.employee.id} on ${context.date}`);
    }

    return new ShiftContext(shift);
  }
}