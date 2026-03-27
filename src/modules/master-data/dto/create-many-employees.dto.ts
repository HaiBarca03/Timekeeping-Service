import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEmployeeDto } from './create-employee.dto';

export class CreateManyEmployeesDto {
  @ApiProperty({ type: [CreateEmployeeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeDto)
  data: CreateEmployeeDto[];
}
