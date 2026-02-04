import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { TimesheetAdjustmentRequest } from './timesheet-adjustment-request.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';

@ObjectType()
@Entity('timesheet_adjustment_request_items')
@Index(['request_id', 'daily_timesheet_id'], { unique: true })
export class TimesheetAdjustmentRequestItem extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  request_id: string;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  daily_timesheet_id: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  note: string;

  @Field(() => TimesheetAdjustmentRequest)
  @ManyToOne(() => TimesheetAdjustmentRequest, (request) => request.items)
  @JoinColumn({ name: 'request_id' })
  request: TimesheetAdjustmentRequest;

  @Field(() => AttendanceDailyTimesheet)
  @ManyToOne(() => AttendanceDailyTimesheet)
  @JoinColumn({ name: 'daily_timesheet_id' })
  daily_timesheet: AttendanceDailyTimesheet;
}