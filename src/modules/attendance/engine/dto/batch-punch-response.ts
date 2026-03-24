import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchPunchResult {
  @ApiProperty({
    example: 10,
    description: 'Số bản ghi đã lưu thành công',
  })
  savedCount: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['id1', 'id2', 'id3'],
    description: 'Danh sách ID đã lưu',
  })
  savedIds?: string[];

  @ApiPropertyOptional({
    example: 5,
    description: 'Số lượng job tính toán đã được đưa vào queue',
  })
  queuedCalculations?: number;

  @ApiPropertyOptional({
    example: 'Batch punch processed successfully',
    description: 'Thông điệp trả về',
  })
  message?: string;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  failedCount: number;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        external_user_id: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  })
  errors?: Array<{ external_user_id: string; reason: string }>;
}
