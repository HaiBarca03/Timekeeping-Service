import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { Company } from '../../master-data/entities/company.entity';

@Entity('attendance_monthly_timesheets')
@Index(['employee_id', 'company_id', 'month', 'year'], { unique: true })
export class AttendanceMonthlyTimesheet extends BaseEntity {
  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  employee_id: string;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_work_days: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_paid_days: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_work_hours: number;

  @Column({ default: 0 })
  total_late_days: number;

  @Column({ default: 0 })
  total_late_minutes: number;

  @Column({ default: 0 })
  total_early_leave_minutes: number;

  @Column({ default: 0 })
  total_missing_check: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_ot_hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_leave_days: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_remote_days: number;

  @Column({ default: 'pending' })
  confirmation_status: string;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at?: Date | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Company, (company) => company.attendanceMonthlyTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
