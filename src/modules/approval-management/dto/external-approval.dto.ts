import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExternalApprovalProcess {
  LEAVE = 'LEAVE',
  REMOTE = 'REMOTE',
  OVERTIME = 'OVERTIME',
  CORRECTION = 'CORRECTION',
  MATERNITY = 'MATERNITY',
  SWAP = 'SWAP',
}

export class ExternalUserIdDto {
  @IsString()
  id: string;
}

export class ExternalRequestCodeDto {
  @IsString()
  text: string;
}

export class ExternalApprovalFieldsDto {
  @IsEnum(ExternalApprovalProcess)
  approval_process: ExternalApprovalProcess;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalUserIdDto)
  requester: ExternalUserIdDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalRequestCodeDto)
  request_code: ExternalRequestCodeDto[];

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsNumber()
  total_hours: number;

  @IsOptional()
  @IsString()
  leave_type_detail?: string;

  @IsOptional()
  @IsString()
  swap_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalUserIdDto)
  swap_with_employee?: ExternalUserIdDto[];

  @IsOptional()
  @IsString()
  maternity_shift?: string;
}

export class ExternalApprovalItemDto {
  @IsString()
  record_id: string;

  @ValidateNested()
  @Type(() => ExternalApprovalFieldsDto)
  fields: ExternalApprovalFieldsDto;
}

export class ExternalApprovalDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalApprovalItemDto)
  items: ExternalApprovalItemDto[];
}

export class ExternalApprovalPayloadDto {
  @ValidateNested()
  @Type(() => ExternalApprovalDataDto)
  data: ExternalApprovalDataDto;
}
