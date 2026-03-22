import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Company } from './entities/company.entity';
import { BusinessException } from 'src/exceptions/business.exception';
import { BusinessCodes } from 'src/constants';
import { userInfo } from 'os';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

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
  }
}
