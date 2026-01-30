//Loại nghỉ phép
export const LEAVE_TYPES = {
  PAID_LEAVE: {
    name: 'Nghỉ phép có lương',
    deduct: 1,
  },
  UNPAID_LEAVE: {
    name: 'Nghỉ không hưởng lương',
    deduct: 0,
  },
  WEDDING_SELF: {
    name: 'Nghỉ chế độ - Bản thân kết hôn',
    deduct: 0,
  },
  WEDDING_CHILD: {
    name: 'Nghỉ chế độ - Con cái kết hôn',
    deduct: 0,
  },
  FUNERAL: {
    name: 'Nghỉ chế độ - Nghỉ hiếu',
    deduct: 0,
  },
  PATERNITY: {
    name: 'Nghỉ chế độ - Nhân viên nam có vợ sinh con (Bảo hiểm chi trả)',
    deduct: 0,
  },
  MATERNITY: {
    name: 'Nghỉ chế độ - Thai sản',
    deduct: 0,
  },
} as const;
