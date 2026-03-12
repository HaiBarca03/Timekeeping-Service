import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchPunchResultDto {
  @ApiProperty({ description: 'Số record đã save thành công', example: 150 })
  savedCount: number;

  @ApiPropertyOptional({
    description: 'Danh sách ID đã save (nếu cần track)',
    type: [String],
    example: ['punch_001', 'punch_002'],
  })
  savedIds?: string[];

  @ApiPropertyOptional({
    description: 'Số lượng calculation được queue để tính công sau',
    example: 120,
  })
  queuedCalculations?: number;

  @ApiPropertyOptional({
    description: 'Thông báo bổ sung (success/warning/error details)',
    example: 'Processed 150/150 punches, 30 queued for overtime calc',
  })
  message?: string;
}