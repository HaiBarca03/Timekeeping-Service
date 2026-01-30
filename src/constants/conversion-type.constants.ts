//Hình thức quy đổi
export const CONVERSION_TYPES = {
  COMPENSATORY_LEAVE: {
    name: 'Nghỉ bù',
    coefficient: 1.5,
  },
  OVERTIME_SALARY: {
    name: 'Lương tăng ca',
    coefficient: 1,
  },
} as const;
