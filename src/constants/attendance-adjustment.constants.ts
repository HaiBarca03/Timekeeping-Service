//Loại điều chỉnh công ca
export const ATTENDANCE_ADJUSTMENT_TYPES = {
  BROKEN_MACHINE: 'Máy chấm công hỏng',
  POWER_OUTAGE: 'Mất điện',
  NETWORK_LOSS: 'Mất kết nối mạng',
  NO_FINGERPRINT: 'Chưa có vân tay',
  NOT_LOCKED_FINGERPRINT: 'Chưa chốt vân tay',
  SYSTEM_ERROR: 'Lỗi hệ thống',
} as const;
