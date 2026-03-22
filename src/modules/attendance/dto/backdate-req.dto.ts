import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OverrideEntityType {
  EMPLOYEE = 'EMPLOYEE',
  ATTENDANCE_GROUP = 'ATTENDANCE_GROUP',
  DEPARTMENT = 'DEPARTMENT',
  SHIFT = 'SHIFT',
  SHIFT_ASSIGNMENT = 'SHIFT_ASSIGNMENT',
}

export class CreateOverrideDto {
  @ApiProperty({
    enum: OverrideEntityType,
    example: OverrideEntityType.ATTENDANCE_GROUP,
    description: 'Loại entity bị override',
  })
  @IsEnum(OverrideEntityType)
  entityType: string;

  @ApiProperty({
    example: '123456',
    description: 'ID của entity',
  })
  @IsString()
  entityId: string;

  @ApiProperty({
    example: '2024-03-01',
    description: 'Ngày bắt đầu áp dụng',
  })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({
    example: '1',
    description: 'ID công ty',
  })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({
    example: '2024-03-05',
    description: 'Ngày kết thúc (optional)',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiProperty({
    example: {
      allowLateMinutes: 60,
      isAngel: true,
      shiftContext: { startTime: '09:00' },
    },
    description: 'Các giá trị override',
  })
  @IsObject()
  overrideValues: any;

  @ApiProperty({
    example: 'Hỗ trợ đi muộn do mưa lớn',
    description: 'Lý do override',
  })
  @IsString()
  reason: string;
}
