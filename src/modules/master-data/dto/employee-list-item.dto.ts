export class CompanyDto {
  companyName: string;
}

export class EmployeeStatusDto {
  statusName: string;
}

export class EmployeeTypeDto {
  typeName: string;
}

export class JobLevelDto {
  levelName: string;
}

export class WorkLocationDto {
  locationName: string;
  address: string;
}

export class DepartmentDto {
  departmentName: string;
  departmentCode: string;
}

export class ManagerDto {
  fullName: string;
  employeeCode: string;
  email: string;
  larkId: string;
}

export class EmployeeListItemDto {
  larkId: string;
  userName: string;
  fullName: string;
  employeeCode: string;
  email: string;
  phoneNumber: string;
  gender: string;

  birthday: Date | null;
  joinedAt: Date | null;
  resignedAt: Date | null;

  companyId: string;

  company: CompanyDto | null;
  employeeStatus: EmployeeStatusDto | null;
  employeeType: EmployeeTypeDto | null;
  jobLevel: JobLevelDto | null;
  workLocation: WorkLocationDto | null;
  departments: DepartmentDto[];
  manager: ManagerDto | null;
}
