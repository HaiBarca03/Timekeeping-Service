import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AttendanceDailyTimesheet } from './attendance-daily-timesheet.entity';

@Entity('attendance_daily_punches')
@Index(['daily_timesheet_id', 'punch_index'], { unique: true })
export class AttendanceDailyPunch extends BaseEntity {
  @Column({ type: 'bigint', nullable: true })
  daily_timesheet_id: string | null;

  @Column()
  punch_index: number;

  @Column({ type: 'timestamp', nullable: true })
  check_in_time?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_out_time?: Date | null;

  @Column({ type: 'text', nullable: true })
  check_in_result?: string | null;

  @Column({ type: 'text', nullable: true })
  check_out_result?: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  late_hours: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  early_hours: number;

  @Column({ default: false })
  miss_check_in: boolean;

  @Column({ default: false })
  miss_check_out: boolean;

  @Column({ type: 'timestamp', nullable: true })
  check_in_actual: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_out_actual: Date | null;

  @ManyToOne(() => AttendanceDailyTimesheet, (ts) => ts.punches)
  @JoinColumn({ name: 'daily_timesheet_id' })
  daily_timesheet: AttendanceDailyTimesheet;
}
