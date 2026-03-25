import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { LeavePolicy } from './leave-policy.entity';
import { LeaveType } from './leave-type.entity';

@Entity('leave_policy_rules')
@Index(['policyId', 'leaveTypeId'], { unique: true })
export class LeavePolicyRule extends BaseEntity {
  @Column({ name: 'policy_id', type: 'bigint' })
  policyId: string;

  @Column({ name: 'leave_type_id', type: 'bigint' })
  leaveTypeId: string;

  @Column({
    name: 'quota_days',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  quotaDays: number | null;

  @Column({ name: 'is_deduct_leave', type: 'boolean', default: true })
  isDeductLeave: boolean;

  // --- Relationships ---

  @ManyToOne(() => LeavePolicy, (policy) => policy.rules)
  @JoinColumn({ name: 'policy_id' })
  policy: LeavePolicy;

  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;
}
