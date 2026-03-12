import { ApiProperty } from '@nestjs/swagger';

export class ImportLeaveDto {
  @ApiProperty({ example: '1', description: 'ID của công ty' })
  company_id: string;

  @ApiProperty({ example: 'NV005', description: 'Mã nhân viên (userId) để tìm employee_id' })
  userId: string;

  @ApiProperty({ example: '1', description: 'ID loại nghỉ phép (1: Phép năm, 2: Ốm...)' })
  leave_type_id: string;

  @ApiProperty({ example: '2026-02-11 13:30:00', description: 'Thời gian bắt đầu nghỉ' })
  start_time: Date;

  @ApiProperty({ example: '2026-02-11 17:30:00', description: 'Thời gian kết thúc nghỉ' })
  end_time: Date;

  @ApiProperty({ example: 4, description: 'Tổng số giờ nghỉ' })
  leave_hours: number;

  @ApiProperty({ example: 'Đi khám bệnh', description: 'Lý do nghỉ', required: false })
  reason?: string;
}