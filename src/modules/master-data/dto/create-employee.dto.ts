import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, IsDateString, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'The original ID of the employee from the external system', example: 'EMP001' })
  @IsString()
  originId: string;

  @ApiProperty({ description: 'Username for the employee system', example: 'john_doe' })
  @IsString()
  userName: string;

  @ApiProperty({ description: 'Full name of the employee', example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Employee code (User ID)', example: 'HHM001' })
  @IsString()
  userId: string;

  @ApiProperty({ required: false, example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '0987654321' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false, enum: ['MALE', 'FEMALE', 'OTHER'], example: 'MALE' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, type: 'string', format: 'date', example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthday?: Date;

  @ApiProperty({ required: false, type: 'string', format: 'date', example: '2023-01-01' })
  @IsOptional()
  @IsDateString()
  joinedAt?: Date;

  @ApiProperty({ required: false, nullable: true, type: 'string', format: 'date', example: null })
  @IsOptional()
  @IsDateString()
  resignedAt?: Date | null;

  @ApiProperty({ required: false, description: 'Lark ID if integrated', example: 'lark_123' })
  @IsOptional()
  @IsString()
  larkId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_saturday_off?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_angel?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_maternity_shift?: boolean;

  @ApiProperty({ description: 'Origin ID of the Company' })
  @IsString()
  companyOriginId: string;

  @ApiProperty({ required: false, description: 'Origin ID of the Work Location' })
  @IsOptional()
  @IsString()
  workLocationOriginId?: string;

  @ApiProperty({ required: false, description: 'Origin ID of the Attendance Group' })
  @IsOptional()
  @IsString()
  attendanceGroupOriginId?: string;

  @ApiProperty({ required: false, description: 'Origin ID / Code of the Job Level' })
  @IsOptional()
  @IsString()
  jobLevelOriginId?: string;

  @ApiProperty({ required: false, description: 'Origin ID / Code of the Employee Type' })
  @IsOptional()
  @IsString()
  employeeTypeOriginId?: string;

  @ApiProperty({ required: false, description: 'Origin ID / Code of the Employee Status' })
  @IsOptional()
  @IsString()
  employeeStatusOriginId?: string;

  @ApiProperty({ required: false, description: 'Origin ID / Code of the Attendance Method' })
  @IsOptional()
  @IsString()
  attendanceMethodOriginId?: string;

  @ApiProperty({ required: false, description: 'Policy Name / Origin ID of the Leave Policy' })
  @IsOptional()
  @IsString()
  leavePolicyOriginId?: string;

  @ApiProperty({ required: false, description: 'Origin ID of the Manager (Employee)' })
  @IsOptional()
  @IsString()
  managerOriginId?: string;

  @ApiProperty({ type: [String], required: false, description: 'Array of Department Origin IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentOriginIds?: string[];
}
