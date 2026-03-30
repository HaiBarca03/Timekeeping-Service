export const LEAVE_TYPES = {
  ANNUAL_LEAVE: 'ANNUAL_LEAVE',               // Nghỉ phép có lương
  UNPAID_LEAVE: 'UNPAID_LEAVE',               // Nghỉ không hưởng lương
  MARRIAGE_SELF: 'MARRIAGE_SELF',             // Nghỉ chế độ - Bản thân kết hôn
  MARRIAGE_CHILD: 'MARRIAGE_CHILD',           // Nghỉ chế độ - Con cái kết hôn
  BEREAVEMENT_LEAVE: 'BEREAVEMENT_LEAVE',     // Nghỉ chế độ - Nghỉ hiếu
  MATERNITY_LEAVE: 'MATERNITY_LEAVE',         // Nghỉ chế độ - Thai sản
  PATERNITY_LEAVE: 'PATERNITY_LEAVE',         // Nghỉ chế độ - Nam có vợ sinh con
  TRAVEL_LEAVE: 'TRAVEL_LEAVE',               // Nghỉ chế độ - Nghỉ du lịch
  COMPENSATORY_LEAVE: 'COMPENSATORY_LEAVE',   // Nghỉ bù      
} as const;

export const LEAVE_TYPE_LABELS: Record<keyof typeof LEAVE_TYPES, string> = {
  ANNUAL_LEAVE: 'Nghỉ phép có lương',
  UNPAID_LEAVE: 'Nghỉ không hưởng lương',
  MARRIAGE_SELF: 'Nghỉ chế độ - Bản thân kết hôn',
  MARRIAGE_CHILD: 'Nghỉ chế độ - Con cái kết hôn',
  BEREAVEMENT_LEAVE: 'Nghỉ chế độ - Nghỉ hiếu',
  MATERNITY_LEAVE: 'Nghỉ chế độ - Thai sản',
  PATERNITY_LEAVE: 'Nghỉ chế độ - Nhân viên nam có vợ sinh con (Bảo hiểm chi trả)',
  TRAVEL_LEAVE: 'Nghỉ chế độ - Nghỉ du lịch',
  COMPENSATORY_LEAVE: 'Nghỉ bù'
};

export const LEAVE_LABEL_TO_CODE = Object.fromEntries(
  Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => [label, key])
) as Record<string, keyof typeof LEAVE_TYPES>;