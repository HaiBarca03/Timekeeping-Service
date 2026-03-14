import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { AttendanceDailyPunch } from './attendance-daily-punch.entity';
import { AttendancePunchRecord } from './attendance-punch-record.entity';
import { Company } from '../../master-data/entities/company.entity';
import { AttendanceRequest } from '../../leave-management/entities/attendance-request.entity';

@ObjectType()
@Entity('attendance_daily_timesheets')
@Index(['employee_id', 'attendance_date'], { unique: true })
export class AttendanceDailyTimesheet extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: string;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  employee_id: string;

  @Field()
  @Column({ type: 'date' })
  attendance_date: Date;

  @Field(() => Int)
  @Column()
  weekday: number; // Thứ trong tuần (0-6)

  @Field()
  @Column()
  month: number;

  @Field()
  @Column()
  year: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  shift_id?: string;

  // --- 2. Dữ liệu Check-in/out (Raw & Actual) ---
  // Sửa các trường Date
  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  check_in_raw: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  check_out_raw: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  check_in_actual: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  check_out_actual: Date | null;

  @Column({ type: 'varchar', nullable: true })
  check_in_result?: string;

  @Column({ type: 'varchar', nullable: true })
  check_out_result?: string;

  // --- 3. Chỉ số tính toán (Phút & Giờ) ---
  @Field(() => Int)
  @Column({ default: 0 })
  late_minutes: number;

  @Field(() => Int)
  @Column({ default: 0 })
  early_leave_minutes: number;

  @Field(() => Int)
  @Column({ default: 0 })
  rest_minutes: number; // Tổng phút nghỉ giữa ca

  @Field(() => Int)
  @Column({ default: 0 })
  work_minutes: number; // Tổng phút làm thực tế

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  actual_work_hours: number; // Tổng giờ làm thực tế

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  total_work_hours_standard: number; // Công chuẩn ca (Ví dụ: 8.0)

  // --- 4. Trạng thái vi phạm & Đơn từ ---
  @Field()
  @Column({ default: false })
  missing_check_in: boolean;

  @Field()
  @Column({ default: false })
  missing_check_out: boolean;

  @Field()
  @Column({ default: false })
  is_late: boolean;

  @Field()
  @Column({ default: false })
  is_early_leave: boolean;

  @Field()
  @Column({ default: false })
  is_leave: boolean;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  leave_hours: number;

  @Field()
  @Column({ default: false })
  is_remote: boolean;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  remote_hours: number;

  @Field()
  @Column({ default: false })
  is_ot: boolean;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  ot_hours: number;

  @Field()
  @Column({ default: false })
  is_holiday: boolean;

  @Field()
  @Column({ default: false })
  is_redundant: boolean;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  adjustment_hours: number;

  @Field()
  @Column({ default: 'Lack' })
  attendance_status: string; // Đủ công / Thiếu công / Nghỉ / Không chấm

  // --- 5. Meta & Kiểm soát ---

  @Column({ type: 'varchar', nullable: true })
  calculation_version?: string;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  calculated_at: Date;

  @Field()
  @Column({ default: false })
  is_recalculated: boolean;

  @Field()
  @Column({ default: false })
  is_configured_off_day: boolean;

  // --- Relationships ---
  @Field(() => Company)
  @ManyToOne(() => Company, company => company.attendanceTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee, employee => employee.attendanceTimesheets)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(() => AttendanceDailyPunch, punch => punch.daily_timesheet)
  punches: AttendanceDailyPunch[];

  // Trong AttendanceDailyTimesheet
  @OneToMany(() => AttendanceRequest, (request) => request.daily_timesheet)
  requests: AttendanceRequest[];
}