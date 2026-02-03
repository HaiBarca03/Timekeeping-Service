export enum EmploymentStatusCode {
  INFO_PENDING = 'INFO_PENDING',       // Cung cấp thông tin
  WAITING_CONFIRM = 'WAITING_CONFIRM', // Chờ xác nhận
  WAITING_ONBOARD = 'WAITING_ONBOARD', // Chờ onboard
  ONBOARDED = 'ONBOARDED',             // Đã onboard (Đang làm việc)
  CANCELLED = 'CANCELLED',             // Hủy onboard
  RESIGNED = 'RESIGNED',               // Đã nghỉ việc
}