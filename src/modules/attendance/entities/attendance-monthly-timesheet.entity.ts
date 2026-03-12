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

  // ===== Work summary =====

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_work_days: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_work_hours: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_standard_hours: number;

  // ===== Late =====

  @Field(() => Int)
  @Column({ default: 0 })
  total_late_days: number;

  @Field(() => Int)
  @Column({ default: 0 })
  total_late_minutes: number;

  // ===== Early leave =====

  @Field(() => Int)
  @Column({ default: 0 })
  total_early_leave_minutes: number;

  // ===== Missing punch =====

  @Field(() => Int)
  @Column({ default: 0 })
  total_missing_check: number;

  // ===== Overtime =====

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_ot_hours: number;

  // ===== Leave =====

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_leave_days: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_leave_hours: number;

  // ===== Remote =====

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_remote_days: number;

  // ===== Adjustment =====

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_adjustment_hours: number;

  // ===== Workflow =====

  @Field({ nullable: true })
  @Column({ nullable: true })
  confirmation_status: string; // pending / confirmed / rejected

  // ===== Relations =====

  @Field(() => Company)
  @ManyToOne(() => Company, company => company.attendanceMonthlyTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee, employee => employee.attendanceMonthlyTimesheets)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}