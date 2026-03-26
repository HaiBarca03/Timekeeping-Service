import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Company } from './entities/company.entity';
import { AttendanceGroup } from './entities/attendance-group.entity';
import { AttendanceMethod } from './entities/attendance-method.entity';
import { EmployeeStatus } from './entities/employee-status.entity';
import { EmployeeType } from './entities/employee-type.entity';
import { JobLevel } from './entities/job-level.entity';
import { LeavePolicy } from './entities/leave-policy.entity';
import { WorkLocation } from './entities/work-locations.entity';
import { Department } from './entities/department.entity';
import { BusinessException } from 'src/exceptions/business.exception';
import { BusinessCodes } from 'src/constants';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { In } from 'typeorm';
import { userInfo } from 'os';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(AttendanceGroup)
    private readonly attendanceGroupRepository: Repository<AttendanceGroup>,

    @InjectRepository(AttendanceMethod)
    private readonly attendanceMethodRepository: Repository<AttendanceMethod>,

    @InjectRepository(EmployeeStatus)
    private readonly employeeStatusRepository: Repository<EmployeeStatus>,

    @InjectRepository(EmployeeType)
    private readonly employeeTypeRepository: Repository<EmployeeType>,

    @InjectRepository(JobLevel)
    private readonly jobLevelRepository: Repository<JobLevel>,

    @InjectRepository(LeavePolicy)
    private readonly leavePolicyRepository: Repository<LeavePolicy>,

    @InjectRepository(WorkLocation)
    private readonly workLocationRepository: Repository<WorkLocation>,

    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) { }

  async findAllEmployees(companyId: string, page = 1, limit = 10) {
    const companyExists = await this.companyRepository.exist({
      where: { id: companyId },
    });

    if (!companyExists) {
      throw new BusinessException(
        BusinessCodes.COMPANY_NOT_FOUND.message,
        BusinessCodes.COMPANY_NOT_FOUND.code,
      );
    }

    const skip = (page - 1) * limit;

    const [employees, totalItems] = await this.employeeRepository.findAndCount({
      where: { companyId },
      relations: [
        'employeeStatus',
        'company',
        'workLocation',
        'jobLevel',
        'manager',
        'employeeType',
        'departments',
      ],
      order: { userId: 'ASC' },
      take: limit,
      skip,
    });

    const totalPages = Math.ceil(totalItems / limit);

    const items = employees.map((e) => ({
      larkId: e.larkId,
      userName: e.userName,
      fullName: e.fullName,
      employeeCode: e.userId,
      email: e.email,
      phoneNumber: e.phoneNumber,
      gender: e.gender,
      birthday: e.birthday,
      joinedAt: e.joinedAt,
      resignedAt: e.resignedAt,
      companyId: e.companyId,

      company: e.company ? { companyName: e.company.companyName } : null,

      employeeStatus: e.employeeStatus
        ? { statusName: e.employeeStatus.statusName }
        : null,

      employeeType: e.employeeType
        ? { typeName: e.employeeType.typeName }
        : null,

      jobLevel: e.jobLevel ? { levelName: e.jobLevel.levelName } : null,

      workLocation: e.workLocation
        ? {
          locationName: e.workLocation.locationName,
          address: e.workLocation.address,
        }
        : null,

      departments:
        e.departments?.map((d) => ({
          departmentName: d.departmentName,
          departmentCode: d.departmentCode,
        })) || [],

      manager: e.manager
        ? {
          fullName: e.manager.fullName,
          employeeCode: e.manager.userId,
          email: e.manager.email,
          larkId: e.manager.larkId,
        }
        : null,
    }));

    return {
      data: {
        employees: {
          items,
          meta: {
            totalItems,
            itemCount: items.length,
            itemsPerPage: limit,
            totalPages,
            currentPage: page,
          },
        },
      },
    };
  }

  async findOneEmployee(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: [
        'employeeStatus',
        'company',
        'attendanceGroup',
        'workLocation',
        'jobLevel',
        'manager',
        'employeeType',
        'departments',
      ],
    });

    if (!employee) {
      throw new BusinessException(
        BusinessCodes.EMPLOYEE_NOT_FOUND.message,
        BusinessCodes.EMPLOYEE_NOT_FOUND.code,
      );
    }
    return employee;
  }

  async createEmployee(dto: CreateEmployeeDto) {
    const relations = await this.resolveOriginIds(dto);

    const employee = this.employeeRepository.create({
      ...dto,
      ...relations,
    });

    return await this.employeeRepository.save(employee);
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOneEmployee(id);

    const relations = await this.resolveOriginIds(dto);

    Object.assign(employee, {
      ...dto,
      ...relations,
    });

    return await this.employeeRepository.save(employee);
  }

  private async resolveOriginIds(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    const relations: any = {};

    if (dto.companyOriginId) {
      const company = await this.companyRepository.findOneBy({ originId: dto.companyOriginId });
      if (!company) throw new BusinessException(`Company with originId ${dto.companyOriginId} not found`, BusinessCodes.NOT_FOUND.code);
      relations.companyId = company.id;
    }

    if (dto.workLocationOriginId) {
      const workLocation = await this.workLocationRepository.findOneBy({ originId: dto.workLocationOriginId });
      if (workLocation) relations.workLocationId = workLocation.id;
    }

    if (dto.attendanceGroupOriginId) {
      const group = await this.attendanceGroupRepository.findOneBy({ originId: dto.attendanceGroupOriginId });
      if (group) relations.attendanceGroup = group;
    }

    if (dto.jobLevelOriginId) {
      const jobLevel = await this.jobLevelRepository.findOneBy({ code: dto.jobLevelOriginId });
      if (jobLevel) relations.jobLevel = jobLevel;
    }

    if (dto.employeeTypeOriginId) {
      const type = await this.employeeTypeRepository.findOneBy({ code: dto.employeeTypeOriginId });
      if (type) relations.employeeType = type;
    }

    if (dto.employeeStatusOriginId) {
      const status = await this.employeeStatusRepository.findOneBy({ code: dto.employeeStatusOriginId });
      if (status) relations.employeeStatus = status;
    }

    if (dto.attendanceMethodOriginId) {
      const method = await this.attendanceMethodRepository.findOneBy({ code: dto.attendanceMethodOriginId });
      if (method) relations.attendanceMethod = method;
    }

    if (dto.leavePolicyOriginId) {
      const policy = await this.leavePolicyRepository.findOneBy({ policyName: dto.leavePolicyOriginId });
      if (policy) relations.leavePolicy = policy;
    }

    if (dto.managerOriginId) {
      const manager = await this.employeeRepository.findOneBy({ originId: dto.managerOriginId });
      if (manager) {
        relations.manager = manager;
        relations.managerId = manager.id;
      }
    }

    if (dto.departmentOriginIds && dto.departmentOriginIds.length > 0) {
      const departments = await this.departmentRepository.findBy({ originId: In(dto.departmentOriginIds) });
      relations.departments = departments;
    }

    return relations;
  }
}
