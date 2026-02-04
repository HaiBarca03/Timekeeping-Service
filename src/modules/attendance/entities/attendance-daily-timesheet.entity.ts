import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { AttendanceDailyPunch } from './attendance-daily-punch.entity';
import { AttendancePunchRecord } from './attendance-punch-record.entity';
import { LeaveRequestItem } from '../../leave-management/entities/leave-request-item.entity';
import { Company } from '../../master-data/entities/company.entity';

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

  @Field()
  @Column()
  month: number;

  @Field()
  @Column()
  year: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  total_workday: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  actual_workday: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  leave_value: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  unpaid_leave_value: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  business_trip_value: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  online_value: number;

  @Field(() => Company)
  @ManyToOne(() => Company, company => company.attendanceTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee, employee => employee.attendanceTimesheets)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(
    () => AttendanceDailyPunch,
    punch => punch.daily_timesheet,
  )
  punches: AttendanceDailyPunch[];

  @Field(() => AttendancePunchRecord)
  @ManyToOne(() => AttendancePunchRecord, punchRecord => punchRecord.dailyTimesheet)
  @JoinColumn({ name: 'daily_timesheet_id' })
  punchRecord: AttendancePunchRecord;


    @Field(() => [LeaveRequestItem], { nullable: 'itemsAndList' }) 
  @OneToMany(() => LeaveRequestItem, item => item.dailyTimesheet)
  leaveRequestItems: LeaveRequestItem[];
}