import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AttendanceDailyTimesheet } from './attendance-daily-timesheet.entity';

@ObjectType()
@Entity('attendance_daily_punches')
@Index(['daily_timesheet_id', 'punch_index'], { unique: true })
export class AttendanceDailyPunch extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  daily_timesheet_id: number;

  @Field(() => Int)
  @Column()
  punch_index: number;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  check_in_time: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  check_out_time: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  check_in_result: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  check_out_result: string;

  @Field(() => Float) 
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  late_hours: number;

  @Field(() => Float) 
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  early_hours: number;

  @Field() 
  @Column({ default: false })
  miss_check_in: boolean;

  @Field() 
  @Column({ default: false })
  miss_check_out: boolean;

  @Field(() => AttendanceDailyTimesheet)
  @ManyToOne(() => AttendanceDailyTimesheet, ts => ts.punches)
  @JoinColumn({ name: 'daily_timesheet_id' })
  daily_timesheet: AttendanceDailyTimesheet;
}