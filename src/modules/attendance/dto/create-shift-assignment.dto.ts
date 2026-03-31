import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateShiftAssignmentDto {
  @ApiProperty({ description: ' ID of the Company' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'External Employee User ID', example: '123456789' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'The original ID of the Store', example: '123456789abc' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'The original ID of the assignment from external system' })
  @IsString()
  @IsOptional()
  originId?: string;

  @ApiProperty({ description: 'Assigned Date (Timestamp in ms)', example: 1711324800000 })
  @IsNumber()
  @IsNotEmpty()
  date: number;

  @ApiProperty({ description: 'Origin ID of the Shift', example: 'S1' })
  @IsString()
  @IsNotEmpty()
  shiftOriginId: string;

  @ApiProperty({ description: 'Standard On Time (Timestamp in ms)', example: 1711353600000 })
  @IsNumber()
  @IsNotEmpty()
  onTime: number;

  @ApiProperty({ description: 'Standard Off Time (Timestamp in ms)', example: 1711386000000 })
  @IsNumber()
  @IsNotEmpty()
  offTime: number;

  @ApiProperty({ description: 'Is the assignment active?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive: boolean = true;
}
