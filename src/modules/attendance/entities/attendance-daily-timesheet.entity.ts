import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { AttendanceDailyPunch } from './attendance-daily-punch.entity';
import { Company } from '../../master-data/entities/company.entity';
import { AttendanceRequest } from '../../approval-management/entities/attendance-request.entity';

@Entity('attendance_daily_timesheets')
@Index(['employee_id', 'attendance_date', 'user_id'], { unique: true })
export class AttendanceDailyTimesheet extends BaseEntity {
  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  employee_id: string;


  @Column({ type: 'varchar' })
  user_id: string;

  @Column({ type: 'date' })
  attendance_date: Date;

  @Column()
  weekday: number;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  shift_id?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  check_in_raw: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_out_raw: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_in_actual: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_out_actual: Date | null;

  @Column({ type: 'varchar', nullable: true })
  check_in_result?: string | null;

  @Column({ type: 'varchar', nullable: true })
  check_out_result?: string | null;

  @Column({ default: 0 })
  late_minutes: number;

  @Column({ default: 0 })
  early_leave_minutes: number;

  @Column({ default: 0 })
  rest_minutes: number;

  @Column({ default: 0 })
  work_minutes: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  actual_work_hours: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  total_work_hours_standard: number;

  @Column({ default: false })
  missing_check_in: boolean;

  @Column({ default: false })
  missing_check_out: boolean;

  @Column({ default: false })
  is_late: boolean;

  @Column({ default: false })
  is_early_leave: boolean;

  @Column({ default: false })
  is_leave: boolean;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  leave_hours: number;

  @Column({ default: false })
  is_remote: boolean;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  remote_hours: number;

  @Column({ default: false })
  is_ot: boolean;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  ot_hours: number;

  @Column({ default: false })
  is_holiday: boolean;

  @Column({ default: false })
  is_redundant: boolean;

  @Column({ type: 'float', default: 0 })
  work_hours_redundant: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  adjustment_hours: number;

  @Column({ default: 'Lack' })
  attendance_status: string;

  @Column({ type: 'varchar', nullable: true })
  calculation_version?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  calculated_at?: Date | null;

  @Column({ default: false })
  is_recalculated: boolean;

  @Column({ default: false })
  is_configured_off_day: boolean;

  @Column({ default: false })
  is_saturday_candidate: boolean;

  @ManyToOne(() => Company, (company) => company.attendanceTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Employee, (employee) => employee.attendanceTimesheets)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(() => AttendanceDailyPunch, (punch) => punch.daily_timesheet)
  punches: AttendanceDailyPunch[];

  @OneToMany(() => AttendanceRequest, (request) => request.daily_timesheet)
  requests: AttendanceRequest[];
}
