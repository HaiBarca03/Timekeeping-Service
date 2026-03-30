import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateShiftAssignmentDto {
  @ApiProperty({ description: ' ID of the Company' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'External Employee User ID', example: '123456789' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Store ID (BigInt/String from Lark)', example: '123456789' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'The original ID of the assignment from external system' })
  @IsString()
  @IsOptional()
  originId?: string;

  @ApiProperty({ description: 'Assigned Date (YYYY-MM-DD)', example: '2026-03-25' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Origin ID of the Shift', example: 'S1' })
  @IsString()
  @IsNotEmpty()
  shiftOriginId: string;

  @ApiProperty({ description: 'Standard On Time (Timestamp)', example: '2026-03-25T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  onTime: string;

  @ApiProperty({ description: 'Standard Off Time (Timestamp)', example: '2026-03-25T17:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  offTime: string;

  @ApiProperty({ description: 'Is the assignment active?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive: boolean = true;
}
