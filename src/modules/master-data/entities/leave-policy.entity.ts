import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { LeavePolicyRule } from './leave-policy-rule.entity';

@Entity('leave_policies')
@Index(['companyId', 'policyName'], { unique: true })
export class LeavePolicy extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'policy_name', type: 'varchar' })
  policyName: string;

  @Column({
    name: 'standard_workdays_in_policy',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  standardWorkdaysInPolicy: number;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => LeavePolicyRule, (rule) => rule.policy)
  rules: LeavePolicyRule[];
}
