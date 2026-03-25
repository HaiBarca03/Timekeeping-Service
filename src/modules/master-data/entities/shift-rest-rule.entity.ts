import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Shift } from './shift.entity';

@Entity('shift_rest_rules')
@Index(['restBeginTime', 'restEndTime'], { unique: true })
export class ShiftRestRule extends BaseEntity {
  @Column({ name: 'rest_begin_time', type: 'time', nullable: true })
  restBeginTime: string;

  @Column({ name: 'rest_end_time', type: 'time', nullable: true })
  restEndTime: string;

  // --- Relationships ---

  @OneToMany(() => Shift, (shift) => shift.restRule)
  shifts: Shift[];
}
