import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { LeavePolicy } from './leave-policy.entity';
import { LeaveType } from './leave-type.entity';
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
@Entity('leave_policy_rules')
@Index(['policyId', 'leaveTypeId'], { unique: true })
export class LeavePolicyRule extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'policy_id', type: 'bigint' })
  policyId: string;

  @Field(() => ID)
  @Column({ name: 'leave_type_id', type: 'bigint' })
  leaveTypeId: string;

  @Field(() => Float, { nullable: true })
  @Column({ name: 'quota_days', type: 'decimal', precision: 6, scale: 2, nullable: true })
  quotaDays: number;

  @Field()
  @Column({ name: 'is_deduct_leave', type: 'boolean', default: true })
  isDeductLeave: boolean;

  @Field(() => LeavePolicy)
  @ManyToOne(() => LeavePolicy, (policy) => policy.rules)
  @JoinColumn({ name: 'policy_id' })
  policy: LeavePolicy;

  @Field(() => LeaveType)
  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;
}