import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
} from 'class-validator';

export class RawPunchInputDto {
  @ApiProperty({ example: 'company_123' })
  @IsString()
  company_id: string;

  @ApiProperty({ example: 'user_456' })
  @IsString()
  external_user_id: string;

  @ApiProperty({
    example: '2026-03-23T08:30:00.000Z',
    description: 'Thời gian chấm công dạng ISO string',
  })
  @IsDateString()
  punch_time: string;

  @ApiProperty({ example: 23 })
  @IsNumber()
  day: number;

  @ApiProperty({ example: 'recxxxxxx' })
  @IsString()
  lark_record_id: string;

  @ApiPropertyOptional({ example: 'check_in' })
  @IsOptional()
  @IsString()
  punch_type?: string;

  @ApiPropertyOptional({ example: 'normal' })
  @IsOptional()
  @IsString()
  punch_result?: string;

  @ApiPropertyOptional({ example: 'mobile' })
  @IsOptional()
  @IsString()
  source_type?: string;

  @ApiPropertyOptional({ example: 21.0285 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 105.8542 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Hoan Kiem, Ha Noi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'device_001' })
  @IsOptional()
  @IsString()
  device_id?: string;

  @ApiPropertyOptional({ example: 'Office Wifi' })
  @IsOptional()
  @IsString()
  ssid?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiPropertyOptional({
    example: '2026-03-23T08:00:00.000Z',
    description: 'Mốc giờ ca mục tiêu dạng ISO string',
  })
  @IsOptional()
  @IsDateString()
  shift_time_target?: string;

  @ApiPropertyOptional({
    example: { source: 'lark', raw: true },
    description: 'Payload gốc nhận từ hệ thống ngoài',
  })
  @IsOptional()
  @IsObject()
  raw_payload?: Record<string, any>;
}
