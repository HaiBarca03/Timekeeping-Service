import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
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
  company_id: number;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  employee_id: number;

  @Field()
  @Column()
  month: number;

  @Field()
  @Column()
  year: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  actual_workday_days: number;

  @Field()
  @Column({ default: 0 })
  total_late_minutes: number;

  @Field()
  @Column({ default: 0 })
  late_count: number;

  @Field()
  @Column({ default: 0 })
  total_overtime_minutes: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  confirmation_status: string; // pending/confirmed/rejected

  @Field(() => Company)
  @ManyToOne(() => Company, company => company.attendanceMonthlyTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee, employee => employee.attendanceMonthlyTimesheets)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}