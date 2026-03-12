import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class GenerateMonthlyTimesheetDto {
  @ApiProperty({ example: '1', description: 'Company ID' })
  @IsString() // Decorator này giúp pipe nhận diện kiểu dữ liệu
  companyId: string;

  @ApiProperty({ example: 3, description: 'Month (1-12)' })
  @IsNumber()
  @Min(1) @Max(12)
  month: number;

  @ApiProperty({ example: 2026, description: 'Year' })
  @IsNumber()
  year: number;
}