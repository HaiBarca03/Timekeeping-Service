import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { LeaveRequest } from './leave-request.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';

@ObjectType()
@Entity('leave_request_items')
@Index(['request_id', 'daily_timesheet_id'], { unique: true })
export class LeaveRequestItem extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  request_id: number;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  daily_timesheet_id: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  leave_value: number;

  @Field(() => Int)
  @Column()
  leave_minutes: number;

  @ManyToOne(() => LeaveRequest, (req) => req.items)
  @JoinColumn({ name: 'request_id' })
  request: LeaveRequest;

  @ManyToOne(() => AttendanceDailyTimesheet, (dailyTimesheet) => dailyTimesheet.leaveRequestItems)
  @JoinColumn({ name: 'daily_timesheet_id' })
  dailyTimesheet: AttendanceDailyTimesheet;
}