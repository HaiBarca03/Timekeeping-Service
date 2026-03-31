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
    description: 'The type of entity being overridden (EMPLOYEE, ATTENDANCE_GROUP, SHIFT, etc.)',
  })
  @IsEnum(OverrideEntityType)
  entityType: OverrideEntityType;

  @ApiProperty({
    example: 'origin_id_123',
    description: 'The business identifier (originId) of the target entity',
  })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({
    example: 'external_id_456',
    description: 'A unique identifier from the source system to track/update this override',
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    example: '2024-03-01',
    description: 'The start date of the override (Inclusive)',
  })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({
    example: 'company_origin_id',
    description: 'The business identifier of the company',
  })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({
    example: '2024-03-05',
    description: 'The end date of the override (Inclusive). If null, applies forever from start date.',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiProperty({
    example: {
      defaultShiftOriginId: 'new_shift_origin_id',
      startTime: '08:30',
      endTime: '17:30',
      isAngel: true,
    },
    description: 'JSON object containing the override values. Can include shift changes or individual property changes.',
  })
  @IsObject()
  overrideValues: Record<string, any>;

  @ApiPropertyOptional({
    example: ['user1', 'user2'],
    description: 'Danh sách user_id của nhân viên bị ảnh hưởng. Nếu được truyền lên, hệ thống sẽ chỉ quét và tính lại cho những nhân viên này.',
  })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({
    example: 'Seasonal shift schedule change for Office Group',
    description: 'The reason for this override',
  })
  @IsString()
  reason: string;
}
