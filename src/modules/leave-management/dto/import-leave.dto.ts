import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class ImportLeaveDto {
  @ApiProperty({ example: 'success' })
  @IsOptional() 
  msg: string;

  @ApiProperty({ example: 0 })
  @IsOptional()
  code: number;

  @ApiProperty({
    example: { total: 3, items: [] },
    description: 'Dữ liệu thô từ Base/Lark'
  })
  @IsNotEmpty() 
  data: any; 
}