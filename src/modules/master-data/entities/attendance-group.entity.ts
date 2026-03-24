import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { Shift } from './shift.entity';

@Entity('attendance_groups')
@Index(['companyId', 'groupName'], { unique: true })
@Index(['companyId', 'code'], { unique: true })
export class AttendanceGroup extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Index({ unique: true })
  @Column({ name: 'origin_id', type: 'varchar', unique: true, nullable: true })
  originId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string; // 'OFFICE_GROUP', 'FACTORY_GROUP', ...

  @Column({ name: 'group_name', type: 'varchar' })
  groupName: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'default_shift_id', type: 'bigint', nullable: true })
  defaultShiftId: string;

  // --- Relations ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'default_shift_id' })
  defaultShift: Shift;

  @ManyToMany(() => Shift, (shift) => shift.attendanceGroups)
  @JoinTable({
    name: 'attendance_group_shifts',
    joinColumn: { name: 'attendance_group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'shift_id', referencedColumnName: 'id' },
  })
  shifts: Shift[];
}
