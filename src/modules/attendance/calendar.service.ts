import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Holiday } from './entities/holidays.entity';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { Shift } from '../master-data/entities/shift.entity';
import { Company } from '../master-data/entities/company.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { BusinessException } from 'src/exceptions/business.exception';
import { BusinessCodes } from 'src/constants';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,

    @InjectRepository(ShiftAssignment)
    private readonly shiftAssignmentRepo: Repository<ShiftAssignment>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) { }

  // --- Holiday APIs ---

  async createHoliday(dto: CreateHolidayDto) {
    const company = await this.resolveCompany(dto.companyId);
    const { companyId, ...data } = dto;
    const holiday = this.holidayRepo.create({
      ...data,
      companyId: company.id,
      holiday_date: new Date(dto.holiday_date),
    });
    return await this.holidayRepo.save(holiday);
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto) {
    const holiday = await this.holidayRepo.findOneBy({ id });
    if (!holiday) {
      throw new BusinessException('Holiday not found', BusinessCodes.NOT_FOUND.code);
    }

    if (dto.companyId) {
      const company = await this.resolveCompany(dto.companyId);
      holiday.companyId = company.id;
    }

    Object.assign(holiday, {
      ...dto,
      holiday_date: dto.holiday_date ? new Date(dto.holiday_date) : holiday.holiday_date,
    });

    return await this.holidayRepo.save(holiday);
  }

  async bulkCreateHolidays(dtos: CreateHolidayDto[]) {
    const companyIds = [...new Set(dtos.map(d => d.companyId))];
    const companies = await this.companyRepo.findBy({ id: In(companyIds) });
    const companyMap = new Map(companies.map(c => [c.id, c]));

    const entities = dtos.map(dto => {
      const company = companyMap.get(dto.companyId);
      if (!company) throw new Error(`Company ${dto.companyId} not found`);
      const { companyId, ...data } = dto;
      return this.holidayRepo.create({
        ...data,
        companyId: company.id,
        holiday_date: new Date(dto.holiday_date),
      });
    });

    return await this.holidayRepo.save(entities);
  }

  async bulkUpdateHolidays(dtos: (UpdateHolidayDto & { id: string })[]) {
    // Định nghĩa results là mảng chứa các kết quả trả về từ updateHoliday
    const results: any[] = [];

    for (const dto of dtos) {
      // Giả sử updateHoliday trả về Entity Holiday hoặc kết quả Update
      const updated = await this.updateHoliday(dto.id, dto);
      results.push(updated);
    }
    return results;
  }

  // --- ShiftAssignment APIs ---

  async createShiftAssignment(dto: CreateShiftAssignmentDto) {
    const company = await this.resolveCompany(dto.companyId);

    const employee = await this.employeeRepo.findOneBy({
      userId: dto.userId,
      companyId: company.id
    });
    if (!employee) {
      throw new BusinessException(`Employee with user_id ${dto.userId} not found in company ${dto.companyId}`, BusinessCodes.EMPLOYEE_NOT_FOUND.code);
    }

    const shift = await this.shiftRepo.findOneBy({
      originId: dto.shiftOriginId,
      // companyId: company.id // Shift might be global or company-specific, check entity
    });
    if (!shift) {
      throw new BusinessException(`Shift with origin_id ${dto.shiftOriginId} not found`, BusinessCodes.NOT_FOUND.code);
    }

    const { companyId, userId, shiftOriginId, ...data } = dto;
    const assignment = this.shiftAssignmentRepo.create({
      ...data,
      companyId: company.id,
      employeeId: employee.id,
      shiftId: shift.id,
      date: new Date(dto.date),
      onTime: new Date(dto.onTime),
      offTime: new Date(dto.offTime),
    });

    return await this.shiftAssignmentRepo.save(assignment);
  }

  async updateShiftAssignment(id: string, dto: UpdateShiftAssignmentDto) {
    const assignment = await this.shiftAssignmentRepo.findOneBy({ id });
    if (!assignment) {
      throw new BusinessException('Shift assignment not found', BusinessCodes.NOT_FOUND.code);
    }

    let companyId = assignment.companyId;
    if (dto.companyId) {
      const company = await this.resolveCompany(dto.companyId);
      companyId = company.id;
      assignment.companyId = companyId;
    }

    if (dto.userId) {
      const employee = await this.employeeRepo.findOneBy({ userId: dto.userId, companyId });
      if (!employee) throw new BusinessException('Employee not found', BusinessCodes.EMPLOYEE_NOT_FOUND.code);
      assignment.employeeId = employee.id;
    }

    if (dto.shiftOriginId) {
      const shift = await this.shiftRepo.findOneBy({ originId: dto.shiftOriginId });
      if (!shift) throw new BusinessException('Shift not found', BusinessCodes.NOT_FOUND.code);
      assignment.shiftId = shift.id;
    }

    Object.assign(assignment, {
      ...dto,
      date: dto.date ? new Date(dto.date) : assignment.date,
      onTime: dto.onTime ? new Date(dto.onTime) : assignment.onTime,
      offTime: dto.offTime ? new Date(dto.offTime) : assignment.offTime,
    });

    return await this.shiftAssignmentRepo.save(assignment);
  }

  async bulkCreateShiftAssignments(dtos: CreateShiftAssignmentDto[]) {
    // Resolve all companies, employees, and shifts first to optimize
    const companyIds = [...new Set(dtos.map(d => d.companyId))];
    const userIds = [...new Set(dtos.map(d => d.userId))];
    const shiftOriginIds = [...new Set(dtos.map(d => d.shiftOriginId))];

    const [companies, employees, shifts] = await Promise.all([
      this.companyRepo.findBy({ id: In(companyIds) }),
      this.employeeRepo.findBy({ userId: In(userIds) }), // Note: might need company filter if userId is not unique globally
      this.shiftRepo.findBy({ originId: In(shiftOriginIds) }),
    ]);

    const companyMap = new Map(companies.map(c => [c.id, c]));
    // Map employee by user_id and companyId for safety
    const employeeMap = new Map(employees.map(e => [`${e.userId}_${e.companyId}`, e]));
    const shiftMap = new Map(shifts.map(s => [s.originId, s]));

    const entities = dtos.map(dto => {
      const company = companyMap.get(dto.companyId);
      if (!company) throw new Error(`Company ${dto.companyId} not found`);

      const employee = employeeMap.get(`${dto.userId}_${company.id}`);
      if (!employee) throw new Error(`Employee ${dto.userId} not found in company ${dto.companyId}`);

      const shift = shiftMap.get(dto.shiftOriginId);
      if (!shift) throw new Error(`Shift ${dto.shiftOriginId} not found`);

      const { companyId, userId, shiftOriginId, ...data } = dto;
      return this.shiftAssignmentRepo.create({
        ...data,
        companyId: company.id,
        employeeId: employee.id,
        shiftId: shift.id,
        date: new Date(dto.date),
        onTime: new Date(dto.onTime),
        offTime: new Date(dto.offTime),
      });
    });

    // Use upsert to handle updates if originId exists
    return await this.shiftAssignmentRepo.save(entities);
  }

  async bulkUpdateShiftAssignments(dtos: CreateShiftAssignmentDto[]) {
    return this.bulkCreateShiftAssignments(dtos);
  }

  private async resolveCompany(originId: string) {
    const company = await this.companyRepo.findOneBy({ id: originId });
    if (!company) {
      throw new BusinessException(`Company with id ${originId} not found`, BusinessCodes.COMPANY_NOT_FOUND.code);
    }
    return company;
  }
}
