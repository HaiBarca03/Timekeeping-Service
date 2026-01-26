<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">
  ⏱️ <b>Timekeeping System</b> – Backend service built with <a href="https://nestjs.com">NestJS</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10-red" />
  <img src="https://img.shields.io/badge/GraphQL-Apollo-blue" />
  <img src="https://img.shields.io/badge/TypeORM-PostgreSQL-green" />
  <img src="https://img.shields.io/badge/Redis-BullMQ-orange" />
</p>

---

## Description

Backend service cho hệ thống **chấm công & quản lý phép**

Hệ thống bao gồm:
- **API Server** (GraphQL)
- **Worker Process** (xử lý tính công, tính phép)
- **Redis** (đóng vai trò trigger & deduplicate task)

---

## Development

- **`yarn start:app:dev`**  
  Chạy API server ở chế độ development (watch mode).

- **`yarn start:worker:dev`**  
  Chạy worker riêng biệt ở chế độ development.

- **`yarn start:dev`**  
  Chạy cả API server và worker song song trong môi trường development.

- **`yarn start:debug`**  
  Chạy API server ở chế độ debug.

---

## Production

- **`yarn build`**  
  Build source TypeScript sang JavaScript (`dist/`).

- **`yarn start:prod`**  
  Chạy API server từ thư mục `dist`.

- **`yarn start:worker:prod`**  
  Chạy worker từ thư mục `dist`.

- **`yarn start:prod:all`**  
  Chạy cả API server và worker song song trong môi trường production.

---

## Database Migration (TypeORM)

- **`yarn migration:create`**  
  Tạo file migration mới.

- **`yarn migration:generate`**  
  Tự động generate migration từ entity hiện tại.

- **`yarn migration:run`**  
  Chạy các migration chưa được apply vào database.

- **`yarn migration:revert`**  
  Rollback migration gần nhất.

---

## Attendance Processing Flow

Luồng xử lý dữ liệu chấm công (attendance raw) được thiết kế theo hướng **eventual consistency** và **batch processing**.

### Flow tổng quát

[External System / Device]
↓
[Attendance API]
↓
[attendance_raw DB] ←─────────┐
↓ │
[Redis pending keys] │
↓ │
[Worker Process] ──────────────┘
↓
[attendance_daily DB]


### Chi tiết

1. External system gửi dữ liệu chấm công (raw).
2. API:
   - Validate dữ liệu cơ bản
   - Lưu raw record vào `attendance_raw`
   - Push Redis key theo `(employeeId + date)`
3. Worker:
   - Scan Redis keys
   - Load dữ liệu liên quan từ DB
   - Tính công theo rule
   - Upsert vào `attendance_daily`
   - Xóa Redis key sau khi xử lý thành công

---

## Leave / Ticket Processing Flow

Áp dụng cho các loại phiếu:
- Nghỉ phép
- Remote
- OT
- Các loại điều chỉnh công khác

### Flow tổng quát

[Create / Update Leave / Ticket]
↓
[DB]
↓
[Redis trigger keys]
↓
[Worker]
↓
[attendance_daily + leave_balance]


### Chi tiết

1. Tạo / duyệt / cập nhật phiếu.
2. API:
   - Lưu phiếu vào DB
   - Xác định các ngày bị ảnh hưởng
   - Push Redis trigger theo:
     - `(employeeId + date)` → tính lại công
     - `(employeeId + year)` → tính lại phép
3. Worker:
   - Re-calc attendance theo ngày
   - Re-calc leave balance theo kỳ
   - Update `attendance_daily` & `leave_balance`

---

## Redis Usage Strategy

Redis được sử dụng như một **lightweight task trigger**, không phải nơi lưu state nghiệp vụ.

### Nguyên tắc
- Chỉ lưu **ID / DATE**
- Không cache payload lớn
- TTL ngắn (1–7 ngày)
- Idempotent processing

### Ví dụ key
attendance:pending:{employeeId}:{date}
attendance:recalc:{employeeId}:{date}
leave:recalc:{employeeId}:{year}

---

## Worker Design Principles

- Chạy độc lập với API server
- Xử lý theo batch (100–200 tasks/lần)
- Mỗi task độc lập, không crash toàn batch
- Retry bằng cách giữ Redis key khi lỗi
- Có thể scale nhiều worker song song

---

## Summary
- API server: ingest & trigger
- Redis: task marker & deduplication
- Worker: xử lý nghiệp vụ nặng
- Database: source of truth