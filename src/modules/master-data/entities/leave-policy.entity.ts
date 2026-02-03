import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { LeavePolicyRule } from './leave-policy-rule.entity';
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
@Entity('leave_policies')
@Index(['companyId', 'policyName'], { unique: true })
export class LeavePolicy extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'policy_name', type: 'varchar' })
  policyName: string;

  @Field(() => Float, { nullable: true })
  @Column({ name: 'standard_workdays_in_policy', type: 'decimal', precision: 6, scale: 2, nullable: true })
  standardWorkdaysInPolicy: number;

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => [LeavePolicyRule], { nullable: 'itemsAndList' })
  @OneToMany(() => LeavePolicyRule, (rule) => rule.policy)
  rules: LeavePolicyRule[];
}