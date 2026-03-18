import { ApiProperty } from '@nestjs/swagger';

class CompanyDto {
  @ApiProperty()
  companyName: string;
}

class EmployeeStatusDto {
  @ApiProperty()
  statusName: string;
}

class EmployeeTypeDto {
  @ApiProperty()
  typeName: string;
}

class JobLevelDto {
  @ApiProperty()
  levelName: string;
}

class WorkLocationDto {
  @ApiProperty()
  locationName: string;

  @ApiProperty()
  address: string;
}

class DepartmentDto {
  @ApiProperty()
  departmentName: string;

  @ApiProperty()
  departmentCode: string;
}

class ManagerDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty()
  employeeCode: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  larkId: string;
}

export class EmployeeItemDto {
  @ApiProperty() larkId: string;
  @ApiProperty() userName: string;
  @ApiProperty() fullName: string;
  @ApiProperty() employeeCode: string;
  @ApiProperty() email: string;
  @ApiProperty() phoneNumber: string;
  @ApiProperty() gender: string;
  @ApiProperty({ nullable: true })
    birthday: string | null;

    @ApiProperty({ nullable: true })
    joinedAt: string | null;

    @ApiProperty({ nullable: true })
    resignedAt: string | null;
  @ApiProperty() standardWorkdays: number;
  @ApiProperty() companyId: string;

  @ApiProperty({ type: CompanyDto })
  company: CompanyDto;

  @ApiProperty({ type: EmployeeStatusDto })
  employeeStatus: EmployeeStatusDto;

  @ApiProperty({ type: EmployeeTypeDto })
  employeeType: EmployeeTypeDto;

  @ApiProperty({ type: JobLevelDto })
  jobLevel: JobLevelDto;

  @ApiProperty({ type: WorkLocationDto })
  workLocation: WorkLocationDto;

  @ApiProperty({ type: [DepartmentDto] })
  departments: DepartmentDto[];

  @ApiProperty({ type: ManagerDto, nullable: true })
   manager: ManagerDto | null;
}

export class PaginationMetaDto {
  @ApiProperty() currentPage: number;
  @ApiProperty() itemCount: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() totalItems: number;
  @ApiProperty() totalPages: number;
}

class EmployeesWrapperDto {
  @ApiProperty({ type: [EmployeeItemDto] })
  items: EmployeeItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

class DataWrapperDto {
  @ApiProperty({ type: EmployeesWrapperDto })
  employees: EmployeesWrapperDto;
}

export class EmployeesResponseDto {
  @ApiProperty({ type: DataWrapperDto })
  data: DataWrapperDto;
}
