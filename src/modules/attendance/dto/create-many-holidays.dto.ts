import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateHolidayDto } from './create-holiday.dto';

export class CreateManyHolidaysDto {
  @ApiProperty({ type: [CreateHolidayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHolidayDto)
  data: CreateHolidayDto[];
}
