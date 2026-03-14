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
import { JobLevel } from './job-level.entity';
import { EmployeeType } from './employee-type.entity';
import { EmployeeStatus } from './employee-status.entity';
import { AttendanceMethod } from './attendance-method.entity';
import { LeavePolicy } from './leave-policy.entity';
import { AttendanceMonthlyTimesheet } from '../../attendance/entities/attendance-monthly-timesheet.entity';
import { AttendancePunchRecord } from '../../attendance/entities/attendance-punch-record.entity';
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';
import { WorkLocation } from './work-locations.entity';
import { Department } from './department.entity';

@ObjectType()
@Entity('employees')
@Index(['companyId', 'userId'], { unique: true })
@Index(['companyId', 'larkId'], { unique: true })
@Index(['companyId', 'email'])
@Index(['managerId'])
export class Employee extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field(() => ID)
  @Column({ name: 'work_location_id', type: 'bigint' })
  workLocationId: string;

  @Field()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Field()
  @Column({ name: 'user_name', type: 'varchar' })
  userName: string;

  @Field()
  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Field({ nullable: true })
  @Column({ name: 'lark_id', type: 'varchar', nullable: true })
  larkId: string;

  @Field({ nullable: true })
  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string;

  @Field({ nullable: true })
  @Column({ name: 'phone_number', type: 'varchar', nullable: true })
  phoneNumber: string;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'manager_id', type: 'bigint', nullable: true })
  managerId: string;

  @Field(() => Float, { nullable: true })
  @Column({ name: 'standard_workdays', type: 'decimal', precision: 6, scale: 2, nullable: true })
  standardWorkdays: number;

  @Field(() => String, { nullable: true })
  @Column({ name: 'birthday', type: 'date', nullable: true })
  birthday: Date;

  @Field(() => String, { nullable: true })
  @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Field(() => String, { nullable: true })
  @Column({ name: 'joined_at', type: 'date', nullable: true })
  joinedAt: Date; // Ngày vào công ty

  @Field(() => String, { nullable: true })
  @Column({ name: 'resigned_at', type: 'date', nullable: true })
  resignedAt: Date | null; // Ngày nghỉ việc

  @Field()
  @Column({ default: false })
  is_saturday_off: boolean;

  @Field()
  @Column({ default: false })
  is_angel: boolean;

  /* Relations */
  @Field(() => Employee, { nullable: true })
  @ManyToOne(() => Employee, (e) => e.subordinates)
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Field(() => [Employee], { nullable: 'itemsAndList' })
  @OneToMany(() => Employee, (e) => e.manager)
  subordinates: Employee[];

  @Field(() => AttendanceGroup, { nullable: true })
  @ManyToOne(() => AttendanceGroup)
  @JoinColumn({ name: 'attendance_group_id' })
  attendanceGroup: AttendanceGroup;

  @Field(() => JobLevel, { nullable: true })
  @ManyToOne(() => JobLevel)
  @JoinColumn({ name: 'job_level_id' })
  jobLevel: JobLevel;

  @Field(() => EmployeeType, { nullable: true })
  @ManyToOne(() => EmployeeType)
  @JoinColumn({ name: 'employee_type_id' })
  employeeType: EmployeeType;

  @Field(() => EmployeeStatus, { nullable: true })
  @ManyToOne(() => EmployeeStatus)
  @JoinColumn({ name: 'employee_status_id' })
  employeeStatus: EmployeeStatus;

  @Field(() => AttendanceMethod, { nullable: true })
  @ManyToOne(() => AttendanceMethod)
  @JoinColumn({ name: 'attendance_method_id' })
  attendanceMethod: AttendanceMethod;

  @Field(() => LeavePolicy, { nullable: true })
  @ManyToOne(() => LeavePolicy)
  @JoinColumn({ name: 'leave_policy_id' })
  leavePolicy: LeavePolicy;

  @Field(() => [AttendanceDailyTimesheet], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendanceDailyTimesheet, (ts) => ts.employee)
  attendanceTimesheets: AttendanceDailyTimesheet[];

  @Field(() => [AttendanceMonthlyTimesheet], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendanceMonthlyTimesheet, (ts) => ts.employee)
  attendanceMonthlyTimesheets: AttendanceMonthlyTimesheet[];

  @Field(() => [AttendancePunchRecord], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendancePunchRecord, (ts) => ts.employee)
  attendancePunchRecords: AttendancePunchRecord[];

  @Field(() => Company)
  @ManyToOne(() => Company, (company) => company.employees)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => WorkLocation, { nullable: true })
  @ManyToOne(() => WorkLocation)
  @JoinColumn({ name: 'work_location_id' })
  workLocation: WorkLocation;

  @Field(() => [Department], { nullable: 'itemsAndList' })
  @ManyToMany(() => Department, (department) => department.employees)
  @JoinTable({
    name: 'employee_departments', 
    joinColumn: { name: 'employee_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'department_id', referencedColumnName: 'id' },
  })
  departments: Department[];
}