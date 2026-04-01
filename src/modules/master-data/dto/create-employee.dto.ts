import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'The original ID of the employee',
    example: 'HHM016022',
  })
  @IsOptional()
  @IsString()
  originId: string;

  @ApiProperty({ description: 'Username', example: 'nhumtq' })
  @IsOptional()
  @IsString()
  userName: string;

  @ApiProperty({ description: 'Full name', example: 'Mạch Thị Quỳnh Như' })
  @IsOptional()
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Employee code (User ID)', example: 'HHM016022' })
  @IsOptional()
  @IsString()
  userId: string;

  @ApiProperty({ required: false, example: 'nhumtq@hoanghamobile.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, example: '84396902770' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    required: false,
    enum: ['MALE', 'FEMALE', 'OTHER'],
    example: 'FEMALE',
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    required: false,
    type: 'string',
    format: 'date',
    example: '1990-01-01',
  })
  @IsOptional()
  @IsString()
  birthday?: Date | string | null;

  @ApiProperty({
    required: false,
    type: 'string',
    format: 'date',
    example: '2026-03-25',
  })
  @IsOptional()
  @IsString()
  joinedAt?: Date | string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  resignedAt?: Date | string | null;

  @ApiProperty({ required: false, description: 'Lark ID if integrated' })
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
  @IsOptional()
  @IsString()
  // Nếu dữ liệu đôi khi gửi "" cho công ty, hãy cân nhắc thêm @IsOptional()
  companyOriginId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workLocationOriginId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attendanceGroupOriginId?: string;

  // --- CẬP NHẬT TÊN FIELD CHO KHỚP VỚI JSON CỦA BẠN ---

  @ApiProperty({
    required: false,
    description: 'Employee Type Code',
    example: 'OFFICIAL',
  })
  @IsOptional()
  @IsString()
  employeeType?: string;

  @ApiProperty({
    required: false,
    description: 'Employee Status Code',
    example: 'WORKING',
  })
  @IsOptional()
  @IsString()
  employeeStatus?: string;

  @ApiProperty({
    required: false,
    description: 'Attendance Method Code',
    example: 'LARK_APP',
  })
  @IsOptional()
  @IsString()
  attendanceMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leavePolicyOriginId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managerOriginId?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Array of Department Origin IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentOriginIds?: string[];
}
