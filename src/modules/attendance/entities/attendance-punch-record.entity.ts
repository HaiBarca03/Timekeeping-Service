import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { AttendanceDailyTimesheet } from './attendance-daily-timesheet.entity';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
@Entity('attendance_punch_records')
export class AttendancePunchRecord extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: number;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  employee_id: number;

  @Field({ nullable: true })
  @Column({ type: 'bigint', nullable: true })
  daily_timesheet_id: number;

  @Field()
  @Index({ unique: true })
  @Column()
  lark_record_id: string;

  @Field()
  @Column({ type: 'timestamp' })
  punch_time: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  punch_type: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  punch_result: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  source_type: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  address: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  raw_payload: any;

  // Relationships
  @Field(() => Company)
  @ManyToOne(() => Company , company => company.attendancePunchRecords)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee , employee => employee.attendancePunchRecords)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Field(() => AttendanceDailyTimesheet)
  @ManyToOne(() => AttendanceDailyTimesheet , dailyTimesheet => dailyTimesheet.punchRecord)
  @JoinColumn({ name: 'daily_timesheet_id' })
  dailyTimesheet: AttendanceDailyTimesheet;
}