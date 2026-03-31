import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { HOLIDAY_TYPES } from '../../../constants/holiday-type.constants';

export class CreateHolidayDto {
  @ApiProperty({ description: 'Name of the holiday', example: 'New Year' })
  @IsString()
  @IsNotEmpty()
  holiday_name: string;

  @ApiProperty({ description: 'Date of the holiday (Timestamp in ms)', example: 1711324800000 })
  @IsNumber()
  @IsNotEmpty()
  holiday_date: number;

  @ApiProperty({
    description: 'Type of holiday',
    enum: Object.values(HOLIDAY_TYPES),
    default: HOLIDAY_TYPES.PUBLIC,
    example: HOLIDAY_TYPES.PUBLIC,
  })
  @IsString()
  @IsOptional()
  holiday_type: string = HOLIDAY_TYPES.PUBLIC;

  @ApiProperty({ description: 'Workday value (0.0 to 1.0)', default: 1.0, example: 1.0 })
  @IsNumber()
  @IsOptional()
  workday_value: number = 1.0;

  @ApiProperty({ description: 'Is the holiday active?', default: true, example: true })
  @IsBoolean()
  @IsOptional()
  is_active: boolean = true;

  @ApiProperty({ description: 'ID of the Company' })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
