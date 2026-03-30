export const HOLIDAY_TYPES = {
  PUBLIC: 'PUBLIC',   // Giá trị này sẽ lưu vào DB (Khớp với Enum)
  ANGEL: 'ANGEL',     // Giá trị này sẽ lưu vào DB
  SPECIAL: 'SPECIAL', // Giá trị này sẽ lưu vào DB
} as const;

// Dùng cái này khi bạn cần lấy chữ "Nghỉ lễ" để hiện lên màn hình
export const HOLIDAY_TYPE_LABELS: Record<keyof typeof HOLIDAY_TYPES, string> = {
  PUBLIC: 'Nghỉ lễ',
  ANGEL: 'Nghỉ lễ Angel',
  SPECIAL: 'Nghỉ đặc biệt',
};