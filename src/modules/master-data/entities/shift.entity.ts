import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { ShiftRestRule } from './shift-rest-rule.entity';
import { AttendanceGroup } from './attendance-group.entity';

@Entity('shifts')
@Index(['companyId', 'shiftName'], { unique: true })
@Index(['companyId', 'code'], { unique: true })
export class Shift extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Index({ unique: true })
  @Column({ name: 'origin_id', type: 'varchar', unique: true, nullable: true })
  originId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'shift_name', type: 'varchar' })
  shiftName: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'allow_late_minutes', type: 'int', default: 0 })
  allowLateMinutes: number; // Số phút cho phép đi muộn

  @Column({ name: 'allow_early_minutes', type: 'int', default: 0 })
  allowEarlyMinutes: number; // Số phút cho phép về sớm

  @Column({ name: 'shift_hours', type: 'float', default: 8 })
  shiftHours: number;

  @Column({ name: 'shift_rest_rule_id', type: 'bigint', nullable: true })
  shiftRestRuleId: string;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => ShiftRestRule, (restRule) => restRule.shifts)
  @JoinColumn({ name: 'shift_rest_rule_id' })
  restRule: ShiftRestRule;

  @ManyToMany(() => AttendanceGroup, (group) => group.shifts)
  attendanceGroups: AttendanceGroup[];
}
