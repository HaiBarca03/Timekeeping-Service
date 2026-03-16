import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { Company } from '../../master-data/entities/company.entity';

@ObjectType()
@Entity('attendance_monthly_timesheets')
@Index(['employee_id', 'company_id', 'month', 'year'], { unique: true })
export class AttendanceMonthlyTimesheet extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: string;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  employee_id: string;

  @Field(() => Int)
  @Column()
  month: number;

  @Field(() => Int)
  @Column()
  year: number;

  // --- Công tổng hợp ---
  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_work_days: number; // Tổng ngày công thực tế đi làm

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_paid_days: number; // Tổng ngày được trả lương (Công làm + Nghỉ phép có lương + Lễ)

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_work_hours: number;

  // --- Vi phạm (Late/Early/Missing) ---
  @Field(() => Int)
  @Column({ default: 0 })
  total_late_days: number;

  @Field(() => Int)
  @Column({ default: 0 })
  total_late_minutes: number;

  @Field(() => Int)
  @Column({ default: 0 })
  total_early_leave_minutes: number;

  @Field(() => Int)
  @Column({ default: 0 })
  total_missing_check: number;

  // --- Tăng ca & Nghỉ ---
  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_ot_hours: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_leave_days: number; // Nghỉ phép (đã quy đổi từ giờ ra ngày công)

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_remote_days: number;

  // --- Trạng thái & Audit ---
  @Field()
  @Column({ default: 'pending' }) // pending, confirmed, locked
  confirmation_status: string;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date;

  // Relations
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Field(() => Company)
  @ManyToOne(() => Company, (company) => company.attendanceMonthlyTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
