import { BaseEntity } from '../../../database/entities/base.entity';
import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { RequestDetailTimeOff } from './request-detail-time-off.entity';
import { RequestDetailOvertime } from './request-detail-overtime.entity';
import { RequestDetailAdjustment } from './request-detail-adjustment.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';
import { LeaveType } from '../../master-data/entities/leave-type.entity';
import { Company } from '../../master-data/entities/company.entity';

export enum RequestType {
  LEAVE = 'LEAVE',
  REMOTE = 'REMOTE',
  OVERTIME = 'OVERTIME',
  CORRECTION = 'CORRECTION',
  MATERNITY = 'MATERNITY',
  SWAP = 'SWAP',
}

@Entity('attendance_requests')
export class AttendanceRequest extends BaseEntity {
  @Column()
  request_id: string;

  @Column()
  employee_id: string;

  @Column({ nullable: true })
  note: string;

  @Column()
  status: string; // Approved, Pending, Rejected

  @Column({ type: 'date' })
  applied_date: Date; // Ngày mà đơn này tác động vào

  @Column({ type: 'boolean', default: true })
  is_counted: boolean; // 1: Tính công, 0: Quá hạn

  @Column({ type: 'float', nullable: true })
  total_hours: number; // Tổng giờ quy đổi

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'leave_type_id',
  })
  leave_type_id: string | null;

  @Column({
    type: 'enum',
    enum: RequestType,
  })
  type: RequestType;

  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ nullable: true, unique: true })
  record_id: string;

  @Column({ type: 'jsonb', nullable: true })
  raw_data: any;

  // --- Relationships ---

  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leave_type_id' })
  leave_type: LeaveType;

  @ManyToOne(() => AttendanceDailyTimesheet, (ts) => ts.requests)
  @JoinColumn({ name: 'daily_timesheet_id' })
  daily_timesheet: AttendanceDailyTimesheet;

  @Column({ nullable: true })
  daily_timesheet_id: string;

  @OneToOne(() => RequestDetailTimeOff, (detail) => detail.request)
  detail_time_off: RequestDetailTimeOff;

  @OneToOne(() => RequestDetailOvertime, (detail) => detail.request)
  detail_overtime: RequestDetailOvertime;

  @OneToOne(() => RequestDetailAdjustment, (detail) => detail.request)
  detail_adjustment: RequestDetailAdjustment;

  @ManyToOne(() => Company, (company) => company.attendanceTimesheets)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
