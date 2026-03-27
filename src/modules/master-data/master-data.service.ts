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
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { In } from 'typeorm';
import { userInfo } from 'os';
import { CreateEmployeeDto } from './dto/create-employee.dto';

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


  // create employee
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
    const cleanedDto = this.cleanData(dto);

    Object.assign(employee, {
      ...cleanedDto,
      ...relations,
    });

    return await this.employeeRepository.save(employee);
  }
  async createManyEmployees(dtos: CreateEmployeeDto[]) {
    const successList: any[] = [];
    const errorList: any[] = [];

    const companyOriginIds = new Set<string>();
    const workLocationOriginIds = new Set<string>();
    const attendanceGroupOriginIds = new Set<string>();
    const jobLevelCodes = new Set<string>();
    const employeeTypeCodes = new Set<string>();
    const employeeStatusCodes = new Set<string>();
    const attendanceMethodCodes = new Set<string>();
    const managerOriginIds = new Set<string>();
    const departmentOriginIds = new Set<string>();

    for (const dto of dtos) {
      if (dto.companyOriginId) companyOriginIds.add(dto.companyOriginId);
      if (dto.workLocationOriginId) workLocationOriginIds.add(dto.workLocationOriginId);
      if (dto.attendanceGroupOriginId) attendanceGroupOriginIds.add(dto.attendanceGroupOriginId);
      if (dto.jobLevel) jobLevelCodes.add(dto.jobLevel);
      if (dto.employeeType) employeeTypeCodes.add(dto.employeeType);
      if (dto.employeeStatus) employeeStatusCodes.add(dto.employeeStatus);
      if (dto.attendanceMethod) attendanceMethodCodes.add(dto.attendanceMethod);
      if (dto.managerOriginId) managerOriginIds.add(dto.managerOriginId);
      if (dto.departmentOriginIds) {
        dto.departmentOriginIds.forEach(id => {
          if (id && id.trim() !== '') departmentOriginIds.add(id);
        });
      }
    }

    const [
      companies,
      locations,
      groups,
      jobLevels,
      empTypes,
      empStatuses,
      attMethods,
      managers,
      departments,
    ] = await Promise.all([
      this.companyRepository.findBy({ originId: In([...companyOriginIds]) }),
      this.workLocationRepository.findBy({ originId: In([...workLocationOriginIds]) }),
      this.attendanceGroupRepository.findBy({ originId: In([...attendanceGroupOriginIds]) }),
      this.jobLevelRepository.findBy({ code: In([...jobLevelCodes]) }),
      this.employeeTypeRepository.findBy({ code: In([...employeeTypeCodes]) }),
      this.employeeStatusRepository.findBy({ code: In([...employeeStatusCodes]) }),
      this.attendanceMethodRepository.findBy({ code: In([...attendanceMethodCodes]) }),
      this.employeeRepository.findBy({ originId: In([...managerOriginIds]) }),
      this.departmentRepository.findBy({ originId: In([...departmentOriginIds]) }),
    ]);

    const companyMap = new Map(companies.map(c => [c.originId, c]));
    const locationMap = new Map(locations.map(l => [l.originId, l]));
    const groupMap = new Map(groups.map(g => [g.originId, g]));
    const jobLevelMap = new Map(jobLevels.map(j => [j.code, j]));
    const empTypeMap = new Map(empTypes.map(t => [t.code, t]));
    const empStatusMap = new Map(empStatuses.map(s => [s.code, s]));
    const attMethodMap = new Map(attMethods.map(m => [m.code, m]));
    const managerMap = new Map(managers.map(m => [m.originId, m]));
    const deptMap = new Map(departments.map(d => [d.originId, d]));

    const employeesToSave: Employee[] = [];

    for (const dto of dtos) {
      try {
        const cleanedDto = this.cleanData(dto);

        if (!cleanedDto.userId || !cleanedDto.userName || !cleanedDto.fullName || !cleanedDto.companyOriginId) {
          throw new Error('Missing essential fields (userId, userName, fullName, or companyOriginId)');
        }

        const company = companyMap.get(cleanedDto.companyOriginId);
        if (!company) {
          throw new Error(`Company with originId ${cleanedDto.companyOriginId} not found`);
        }

        const relations: any = {
          company,
          companyId: company.id,
        };

        if (cleanedDto.workLocationOriginId) {
          const loc = locationMap.get(cleanedDto.workLocationOriginId);
          if (loc) relations.workLocationId = loc.id;
        }

        if (cleanedDto.attendanceGroupOriginId) {
          const g = groupMap.get(cleanedDto.attendanceGroupOriginId);
          if (g) relations.attendanceGroup = g;
        }

        if (cleanedDto.jobLevel) {
          const jl = jobLevelMap.get(cleanedDto.jobLevel);
          if (jl) relations.jobLevel = jl;
        }

        if (cleanedDto.employeeType) {
          const et = empTypeMap.get(cleanedDto.employeeType);
          if (et) relations.employeeType = et;
        }

        if (cleanedDto.employeeStatus) {
          const es = empStatusMap.get(cleanedDto.employeeStatus);
          if (es) relations.employeeStatus = es;
        }

        if (cleanedDto.attendanceMethod) {
          const am = attMethodMap.get(cleanedDto.attendanceMethod);
          if (am) relations.attendanceMethod = am;
        }

        if (cleanedDto.managerOriginId) {
          const m = managerMap.get(cleanedDto.managerOriginId);
          if (m) {
            relations.manager = m;
            relations.managerId = m.id;
          }
        }

        if (cleanedDto.departmentOriginIds && cleanedDto.departmentOriginIds.length > 0) {
          relations.departments = cleanedDto.departmentOriginIds
            .map(id => deptMap.get(id))
            .filter(d => !!d);
        }

        const employee = this.employeeRepository.create();
        Object.assign(employee, cleanedDto);
        Object.assign(employee, relations);

        employeesToSave.push(employee);
        successList.push({ originId: cleanedDto.originId || cleanedDto.userId });
      } catch (error) {
        errorList.push({
          originId: dto.originId || dto.userId,
          reason: error.message,
        });
      }
    }

    if (employeesToSave.length > 0) {
      await this.employeeRepository.save(employeesToSave);
    }

    return {
      summary: {
        total: dtos.length,
        success: employeesToSave.length,
        failed: errorList.length,
      },
      data: {
        success: successList,
        failed: errorList,
      },
    };
  }

  async updateManyEmployees(dtos: CreateEmployeeDto[]) {
    const successList: any[] = [];
    const errorList: any[] = [];

    const userIds = new Set<string>();
    const originIds = new Set<string>();
    const companyOriginIds = new Set<string>();
    const workLocationOriginIds = new Set<string>();
    const attendanceGroupOriginIds = new Set<string>();
    const jobLevelCodes = new Set<string>();
    const employeeTypeCodes = new Set<string>();
    const employeeStatusCodes = new Set<string>();
    const attendanceMethodCodes = new Set<string>();
    const managerOriginIds = new Set<string>();
    const departmentOriginIds = new Set<string>();

    for (const dto of dtos) {
      if (dto.userId) userIds.add(dto.userId);
      if (dto.originId) originIds.add(dto.originId);
      if (dto.companyOriginId) companyOriginIds.add(dto.companyOriginId);
      if (dto.workLocationOriginId) workLocationOriginIds.add(dto.workLocationOriginId);
      if (dto.attendanceGroupOriginId) attendanceGroupOriginIds.add(dto.attendanceGroupOriginId);
      if (dto.jobLevel) jobLevelCodes.add(dto.jobLevel);
      if (dto.employeeType) employeeTypeCodes.add(dto.employeeType);
      if (dto.employeeStatus) employeeStatusCodes.add(dto.employeeStatus);
      if (dto.attendanceMethod) attendanceMethodCodes.add(dto.attendanceMethod);
      if (dto.managerOriginId) managerOriginIds.add(dto.managerOriginId);
      if (dto.departmentOriginIds) {
        dto.departmentOriginIds.forEach(id => {
          if (id && id.trim() !== '') departmentOriginIds.add(id);
        });
      }
    }

    const [
      existingEmployees,
      companies,
      locations,
      groups,
      jobLevels,
      empTypes,
      empStatuses,
      attMethods,
      managers,
      departments,
    ] = await Promise.all([
      this.employeeRepository.find({
        where: [
          { userId: In([...userIds]) },
          { originId: In([...originIds]) },
        ],
      }),
      this.companyRepository.findBy({ originId: In([...companyOriginIds]) }),
      this.workLocationRepository.findBy({ originId: In([...workLocationOriginIds]) }),
      this.attendanceGroupRepository.findBy({ originId: In([...attendanceGroupOriginIds]) }),
      this.jobLevelRepository.findBy({ code: In([...jobLevelCodes]) }),
      this.employeeTypeRepository.findBy({ code: In([...employeeTypeCodes]) }),
      this.employeeStatusRepository.findBy({ code: In([...employeeStatusCodes]) }),
      this.attendanceMethodRepository.findBy({ code: In([...attendanceMethodCodes]) }),
      this.employeeRepository.findBy({ originId: In([...managerOriginIds]) }),
      this.departmentRepository.findBy({ originId: In([...departmentOriginIds]) }),
    ]);

    const employeeMap = new Map();
    existingEmployees.forEach(e => {
      if (e.userId) employeeMap.set(e.userId, e);
      if (e.originId) employeeMap.set(e.originId, e);
    });

    const companyMap = new Map(companies.map(c => [c.originId, c]));
    const locationMap = new Map(locations.map(l => [l.originId, l]));
    const groupMap = new Map(groups.map(g => [g.originId, g]));
    const jobLevelMap = new Map(jobLevels.map(j => [j.code, j]));
    const empTypeMap = new Map(empTypes.map(t => [t.code, t]));
    const empStatusMap = new Map(empStatuses.map(s => [s.code, s]));
    const attMethodMap = new Map(attMethods.map(m => [m.code, m]));
    const managerMap = new Map(managers.map(m => [m.originId, m]));
    const deptMap = new Map(departments.map(d => [d.originId, d]));

    const employeesToUpdate: Employee[] = [];

    for (const dto of dtos) {
      try {
        const cleanedDto = this.cleanData(dto);
        const employee = employeeMap.get(cleanedDto.originId) || employeeMap.get(cleanedDto.userId);

        if (!employee) {
          throw new Error(`Employee with originId/userId not found`);
        }

        const relations: any = {};

        if (cleanedDto.companyOriginId) {
          const company = companyMap.get(cleanedDto.companyOriginId);
          if (company) {
            relations.company = company;
            relations.companyId = company.id;
          }
        }

        if (cleanedDto.workLocationOriginId) {
          const loc = locationMap.get(cleanedDto.workLocationOriginId);
          if (loc) relations.workLocationId = loc.id;
        }

        if (cleanedDto.attendanceGroupOriginId) {
          const g = groupMap.get(cleanedDto.attendanceGroupOriginId);
          if (g) relations.attendanceGroup = g;
        }

        if (cleanedDto.jobLevel) {
          const jl = jobLevelMap.get(cleanedDto.jobLevel);
          if (jl) relations.jobLevel = jl;
        }

        if (cleanedDto.employeeType) {
          const et = empTypeMap.get(cleanedDto.employeeType);
          if (et) relations.employeeType = et;
        }

        if (cleanedDto.employeeStatus) {
          const es = empStatusMap.get(cleanedDto.employeeStatus);
          if (es) relations.employeeStatus = es;
        }

        if (cleanedDto.attendanceMethod) {
          const am = attMethodMap.get(cleanedDto.attendanceMethod);
          if (am) relations.attendanceMethod = am;
        }

        if (cleanedDto.managerOriginId) {
          const m = managerMap.get(cleanedDto.managerOriginId);
          if (m) {
            relations.manager = m;
            relations.managerId = m.id;
          }
        }

        if (cleanedDto.departmentOriginIds && cleanedDto.departmentOriginIds.length > 0) {
          relations.departments = cleanedDto.departmentOriginIds
            .map(id => deptMap.get(id))
            .filter(d => !!d);
        }

        Object.assign(employee, cleanedDto);
        Object.assign(employee, relations);

        employeesToUpdate.push(employee);
        successList.push({ originId: cleanedDto.originId || cleanedDto.userId });
      } catch (error) {
        errorList.push({
          originId: dto.originId || dto.userId,
          reason: error.message,
        });
      }
    }

    if (employeesToUpdate.length > 0) {
      await this.employeeRepository.save(employeesToUpdate);
    }

    return {
      summary: {
        total: dtos.length,
        updated: employeesToUpdate.length,
        failed: errorList.length,
      },
      data: {
        success: successList,
        failed: errorList,
      },
    };
  }

  private async resolveOriginIds(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    const relations: any = {};

    if (dto.companyOriginId) {
      const company = await this.companyRepository.findOneBy({
        originId: dto.companyOriginId,
      });
      if (!company) {
        throw new BusinessException(
          `Company with originId ${dto.companyOriginId} not found`,
          BusinessCodes.NOT_FOUND.code,
        );
      }
      relations.company = company;
      relations.companyId = company.id;
    }

    // 2. Work Location
    if (dto.workLocationOriginId) {
      const workLocation = await this.workLocationRepository.findOneBy({
        originId: dto.workLocationOriginId,
      });
      if (workLocation) relations.workLocationId = workLocation.id;
    }

    // 3. Attendance Group
    if (dto.attendanceGroupOriginId) {
      const group = await this.attendanceGroupRepository.findOneBy({
        originId: dto.attendanceGroupOriginId,
      });
      if (group) relations.attendanceGroup = group;
    }

    // 4. Job Level
    if (dto.jobLevel) {
      const jobLevel = await this.jobLevelRepository.findOneBy({
        code: dto.jobLevel,
      });
      if (jobLevel) relations.jobLevel = jobLevel;
    }

    // 5. Employee Type
    if (dto.employeeType) {
      const type = await this.employeeTypeRepository.findOneBy({
        code: dto.employeeType,
      });
      if (type) relations.employeeType = type;
    }

    // 6. Employee Status
    if (dto.employeeStatus) {
      const status = await this.employeeStatusRepository.findOneBy({
        code: dto.employeeStatus,
      });
      if (status) relations.employeeStatus = status;
    }

    // 7. Attendance Method
    if (dto.attendanceMethod) {
      const method = await this.attendanceMethodRepository.findOneBy({
        code: dto.attendanceMethod,
      });
      if (method) relations.attendanceMethod = method;
    }

    // 8. Manager
    if (dto.managerOriginId) {
      const manager = await this.employeeRepository.findOneBy({
        originId: dto.managerOriginId,
      });
      if (manager) {
        relations.manager = manager;
        relations.managerId = manager.id;
      }
    }

    // 9. Departments
    if (dto.departmentOriginIds && dto.departmentOriginIds.length > 0) {
      const validDeptIds = dto.departmentOriginIds.filter(
        (id) => id && id.trim() !== '',
      );
      if (validDeptIds.length > 0) {
        relations.departments = await this.departmentRepository.findBy({
          originId: In(validDeptIds),
        });
      }
    }

    return relations;
  }
  private cleanData(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    const cleaned = { ...dto };

    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    });

    // 2. Xử lý riêng số điện thoại nếu bị dính đuôi .0 do format Excel
    if (typeof cleaned.phoneNumber === 'string') {
      cleaned.phoneNumber = cleaned.phoneNumber.replace('.0', '');
    }

    return cleaned;
  }
}
