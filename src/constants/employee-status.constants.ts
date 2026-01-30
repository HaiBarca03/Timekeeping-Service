//Trạng thái nhân viên
export const EMPLOYEE_STATUSES = {
  PROVIDE_INFO: 'Cung cấp thông tin',
  WAIT_CONFIRM: 'Chờ xác nhận',
  WAIT_ONBOARD: 'Chờ onboard',
  ONBOARDED: 'Đã onboard',
  CANCEL_ONBOARD: 'Hủy onboard',
} as const;
