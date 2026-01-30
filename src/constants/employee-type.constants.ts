//Employee Type
export const EMPLOYEE_TYPES = {
  INTERN: 'Thực tập',
  COLLABORATOR: 'Cộng tác viên',
  PART_TIME: 'Part time',
  SHIFT: 'Ca kíp',
  PROBATION: 'Thử việc',
  OFFICIAL: 'Chính thức',
} as const;

export type EmployeeType = typeof EMPLOYEE_TYPES[keyof typeof EMPLOYEE_TYPES];
