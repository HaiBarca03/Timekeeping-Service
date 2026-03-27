<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">
  ⏱️ <b>Timekeeping System</b> – Backend service built with <a href="https://nestjs.com">NestJS 11</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-red" />
  <img src="https://img.shields.io/badge/REST-Swagger-blue" />
  <img src="https://img.shields.io/badge/TypeORM-PostgreSQL-green" />
</p>

---

## Description

Backend service cho hệ thống **chấm công & quản lý nhân sự** (Timekeeping & HR Management).
Hệ thống được thiết kế dưới dạng monolithic architecture, sử dụng REST API để giao tiếp và Swagger để tài liệu hóa.

Các tính năng chính:
- Quản lý nhân viên (Master Data).
- Tiếp nhận và xử lý dữ liệu chấm công thô (Attendance Raw).
- Đồng bộ dữ liệu phê duyệt từ hệ thống ngoài (Approval Management).
- Engine tính toán bảng công tự động.

---

## API Endpoints & Features

### 1. Master Data (Employee Management)
- **`GET /master-data/employees`**: Lấy danh sách nhân viên (phân trang, lọc theo `companyId`).
- **`POST /master-data/employees`**: Tạo mới một nhân viên.
- **`PATCH /master-data/employees/:id`**: Cập nhật thông tin nhân viên theo ID nội bộ.
- **`POST /master-data/employees/bulk`**: Import hàng loạt nhân viên mới.
- **`POST /master-data/employees/bulk-update`**: Cập nhật hàng loạt nhân viên theo `originId` hoặc `userId`.

### 2. Approval Management (Import Dữ liệu Phê duyệt)
- **`POST /approval-management`**: Tiếp nhận dữ liệu phê duyệt (đơn từ Base, Lark, v.v.).
- **Hỗ trợ các loại đơn**: `LEAVE`, `REMOTE`, `OVERTIME`, `CORRECTION`, `MATERNITY`, `SWAP`.
- **Đặc điểm**: Tự động phân loại, lưu lịch sử và kích hoạt tính toán lại bảng công cho các ngày liên quan.

---

## Architecture & Data Flow

Hệ thống hoạt động theo mô hình xử lý trực tiếp (In-process processing) để đảm bảo tính đơn giản và dễ bảo trì.

### 1. Attendance Processing Flow
Dữ liệu chấm công thô được đẩy vào và xử lý như sau:
1. **API Ingest**: Nhận dữ liệu chấm công từ thiết bị hoặc hệ thống bên ngoài.
2. **Database Persistence**: Lưu vào bảng `attendance_raw`.
3. **In-process Calculation**: Gọi trực tiếp `AttendanceEngine` để tính toán công cho nhân viên trong ngày đó.
4. **Result Storage**: Lưu kết quả cuối cùng vào bảng `attendance_daily`.

### 2. Leave / Approval Flow
1. **API Ingest**: Tiếp nhận đơn phê duyệt.
2. **Persistence**: Lưu thông tin đơn và các bảng chi tiết (`RequestDetailTimeOff`, etc.).
3. **Trigger Recalculation**: Hệ thống xác định các ngày bị ảnh hưởng và gọi `AttendanceEngine` để cập nhật bảng công (`attendance_daily`). 
   - *Lưu ý:* Việc tính toán được thực hiện dưới dạng asynchronous in-process (không đợi kết quả trả về API) để tối ưu thời gian phản hồi.

---

## Development & Production

### Scripts
- **`yarn start:dev`**: Chạy ứng dụng ở chế độ watch mode cho môi trường development.
- **`yarn build`**: Biên dịch mã nguồn TypeScript sang JavaScript.
- **`yarn start:prod`**: Chạy ứng dụng từ thư mục `dist`.

### Database Migration
- **`yarn migration:generate`**: Tạo migration mới từ thay đổi Entity.
- **`yarn migration:run`**: Thực thi các migration chưa chạy.
- **`yarn migration:revert`**: Hoàn tác migration gần nhất.

---

## Summary
- **API Server**: Express backend dựa trên NestJS.
- **ORM**: TypeORM kết nối PostgreSQL.
- **Documentation**: Swagger UI truy cập tại `/apis/docs`.
- **Background Tasks**: Các tác vụ nặng (tính công) được xử lý bất đồng bộ trong cùng tiến trình (In-process Async).