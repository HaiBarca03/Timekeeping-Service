import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShiftAssignmentDto } from './create-shift-assignment.dto';

export class CreateManyShiftAssignmentsDto {
  @ApiProperty({ type: [CreateShiftAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShiftAssignmentDto)
  data: CreateShiftAssignmentDto[];
}
