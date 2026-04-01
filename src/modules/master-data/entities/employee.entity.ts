import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { AttendanceGroup } from './attendance-group.entity';
import { EmployeeType } from './employee-type.entity';
import { EmployeeStatus } from './employee-status.entity';
import { AttendanceMethod } from './attendance-method.entity';
import { LeavePolicy } from './leave-policy.entity';
import { AttendanceMonthlyTimesheet } from '../../attendance/entities/attendance-monthly-timesheet.entity';
import { AttendancePunchRecord } from '../../attendance/entities/attendance-punch-record.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';
import { WorkLocation } from './work-locations.entity';
import { Department } from './department.entity';

@Entity('employees')
@Index(['companyId', 'userId'], { unique: true })
@Index(['companyId', 'larkId'], { unique: true })
@Index(['companyId', 'email'])
@Index(['managerId'])
export class Employee extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'work_location_id', type: 'bigint' })
  workLocationId: string;

  @Index({ unique: true })
  @Column({ name: 'origin_id', type: 'varchar', unique: true, nullable: true })
  originId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar' })
  userName: string;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Column({ name: 'lark_id', type: 'varchar', nullable: true })
  larkId: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true })
  phoneNumber: string;

  @Column({ name: 'manager_id', type: 'bigint', nullable: true })
  managerId: string;

  @Column({ name: 'birthday', type: 'date', nullable: true })
  birthday: Date;

  @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Column({ name: 'joined_at', type: 'date', nullable: true })
  joinedAt: Date; // Ngày vào công ty

  @Column({ name: 'resigned_at', type: 'date', nullable: true })
  resignedAt: Date | null; // Ngày nghỉ việc

  @Column({ default: false })
  is_saturday_off: boolean;

  @Column({ default: false })
  is_angel: boolean;

  @Column({ default: false })
  is_maternity_shift: boolean;

  // --- Relations ---

  @ManyToOne(() => Employee, (e) => e.subordinates)
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @OneToMany(() => Employee, (e) => e.manager)
  subordinates: Employee[];

  @ManyToOne(() => AttendanceGroup)
  @JoinColumn({ name: 'attendance_group_id' })
  attendanceGroup: AttendanceGroup;

  @ManyToOne(() => EmployeeType)
  @JoinColumn({ name: 'employee_type_id' })
  employeeType: EmployeeType;

  @ManyToOne(() => EmployeeStatus)
  @JoinColumn({ name: 'employee_status_id' })
  employeeStatus: EmployeeStatus;

  @ManyToOne(() => AttendanceMethod)
  @JoinColumn({ name: 'attendance_method_id' })
  attendanceMethod: AttendanceMethod;

  @ManyToOne(() => LeavePolicy)
  @JoinColumn({ name: 'leave_policy_id' })
  leavePolicy: LeavePolicy;

  @OneToMany(() => AttendanceDailyTimesheet, (ts) => ts.employee)
  attendanceTimesheets: AttendanceDailyTimesheet[];

  @OneToMany(() => AttendanceMonthlyTimesheet, (ts) => ts.employee)
  attendanceMonthlyTimesheets: AttendanceMonthlyTimesheet[];

  @OneToMany(() => AttendancePunchRecord, (ts) => ts.employee)
  attendancePunchRecords: AttendancePunchRecord[];

  @ManyToOne(() => Company, (company) => company.employees)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => WorkLocation)
  @JoinColumn({ name: 'work_location_id' })
  workLocation: WorkLocation;

  @ManyToMany(() => Department, (department) => department.employees)
  @JoinTable({
    name: 'employee_departments',
    joinColumn: { name: 'employee_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'department_id', referencedColumnName: 'id' },
  })
  departments: Department[];
}
