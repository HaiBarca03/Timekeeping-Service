import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';
import { WorkLocationRequest } from './work-location-request.entity';

@ObjectType()
@Entity('work_location_request_items')
@Index(['request_id', 'daily_timesheet_id'], { unique: true })
export class WorkLocationRequestItem extends BaseEntity {
  @Field(() => ID) @Column({ type: 'bigint' }) request_id: string;
  @Field(() => ID) @Column({ type: 'bigint' }) daily_timesheet_id: string;

  @Field(() => WorkLocationRequest)
  @ManyToOne(() => WorkLocationRequest, (req) => req.items)
  @JoinColumn({ name: 'request_id' })
  request: WorkLocationRequest;

  @Field(() => AttendanceDailyTimesheet)
  @ManyToOne(() => AttendanceDailyTimesheet)
  @JoinColumn({ name: 'daily_timesheet_id' })
  daily_timesheet: AttendanceDailyTimesheet;
}