import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExternalApprovalProcess {
  LEAVE = 'LEAVE',
  REMOTE = 'REMOTE',
  OVERTIME = 'OVERTIME',
  CORRECTION = 'CORRECTION',
  MATERNITY = 'MATERNITY',
  SWAP = 'SWAP',
}

export class ExternalUserIdDto {
  @ApiProperty({ example: 'EMP001' })
  @IsString()
  id: string;
}

export class ExternalRequestCodeDto {
  @ApiProperty({ example: 'REQ-2024-001' })
  @IsString()
  text: string;
}

export class ExternalApprovalFieldsDto {
  @ApiProperty({ enum: ExternalApprovalProcess, example: ExternalApprovalProcess.LEAVE })
  @IsEnum(ExternalApprovalProcess)
  approval_process: ExternalApprovalProcess;

  @ApiProperty({ type: [ExternalUserIdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalUserIdDto)
  requester: ExternalUserIdDto[];

  @ApiProperty({ type: [ExternalRequestCodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalRequestCodeDto)
  request_code: ExternalRequestCodeDto[];

  @ApiProperty({ example: 'approved' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: 'Lý do xin nghỉ phép' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: '2024-03-20T08:00:00Z' })
  @IsString()
  start_time: string;

  @ApiProperty({ example: '2024-03-20T17:30:00Z' })
  @IsString()
  end_time: string;

  @ApiProperty({ example: 8.5 })
  @IsNumber()
  total_hours: number;

  @ApiPropertyOptional({ example: 'Nghỉ phép năm' })
  @IsOptional()
  @IsString()
  leave_type_detail?: string;

  @ApiPropertyOptional({ example: '2024-03-21' })
  @IsOptional()
  @IsString()
  swap_date?: string;

  @ApiPropertyOptional({ type: [ExternalUserIdDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalUserIdDto)
  swap_with_employee?: ExternalUserIdDto[];

  @ApiPropertyOptional({ example: 'Ca sáng' })
  @IsOptional()
  @IsString()
  maternity_shift?: string;
}

export class ExternalApprovalItemDto {
  @ApiProperty({ example: 'rec_123456789' })
  @IsString()
  record_id: string;

  @ApiProperty({ type: ExternalApprovalFieldsDto })
  @ValidateNested()
  @Type(() => ExternalApprovalFieldsDto)
  fields: ExternalApprovalFieldsDto;
}

export class ExternalApprovalDataDto {
  @ApiProperty({ type: [ExternalApprovalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalApprovalItemDto)
  items: ExternalApprovalItemDto[];
}

export class ExternalApprovalPayloadDto {
  @ApiProperty({ type: ExternalApprovalDataDto })
  @ValidateNested()
  @Type(() => ExternalApprovalDataDto)
  data: ExternalApprovalDataDto;
}