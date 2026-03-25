import { Type } from '@nestjs/common';

export class PaginationInfo {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

// Cấu trúc trả về cho kết quả phân trang
export function Paginated<T>(classRef: Type<T>) {
  abstract class PaginatedType {
    items: T[];
    meta: PaginationInfo;
  }
  return PaginatedType as any;
}

// Cấu trúc cho Request Params (Query params)
export class PaginationArgs {
  page: number = 1;
  limit: number = 10;
}
