// import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
// import { BaseEntity } from '../../../database/entities/base.entity';
// import { TimesheetAdjustmentRequest } from './timesheet-adjustment-request.entity';
// import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';

// @Entity('timesheet_adjustment_request_items')
// @Index(['request_id', 'daily_timesheet_id'], { unique: true })
// export class TimesheetAdjustmentRequestItem extends BaseEntity {
//   @Column({ type: 'bigint' })
//   request_id: string;

//   @Column({ type: 'bigint' })
//   daily_timesheet_id: string;

//   @Column({ nullable: true })
//   note: string;

//   // --- Relationships ---

//   @ManyToOne(() => TimesheetAdjustmentRequest, (request) => request.items)
//   @JoinColumn({ name: 'request_id' })
//   request: TimesheetAdjustmentRequest;

//   @ManyToOne(() => AttendanceDailyTimesheet)
//   @JoinColumn({ name: 'daily_timesheet_id' })
//   daily_timesheet: AttendanceDailyTimesheet;
// }
