import { ApiProperty } from '@nestjs/swagger';
import { EmployeeListItemDto } from './employee-list-item.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 150, description: 'Tổng số item có trong DB' })
  totalItems: number;

  @ApiProperty({ example: 15, description: 'Số item hiện tại trả về' })
  itemCount: number;

  @ApiProperty({ example: 10, description: 'Số item mỗi trang' })
  itemsPerPage: number;

  @ApiProperty({ example: 15, description: 'Tổng số trang' })
  totalPages: number;

  @ApiProperty({ example: 3, description: 'Trang hiện tại' })
  currentPage: number;
}

export class EmployeesWrapperDto {
  @ApiProperty({ type: [EmployeeListItemDto] })
  items: EmployeeListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class DataWrapperDto {
  @ApiProperty({ type: EmployeesWrapperDto })
  employees: EmployeesWrapperDto;
}

export class EmployeesResponseDto {
  @ApiProperty({ type: DataWrapperDto })
  data: DataWrapperDto;
}