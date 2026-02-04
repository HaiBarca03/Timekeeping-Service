import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';
import { ApprovalWorkflowStep } from './approval-workflow-step.entity';

@ObjectType()
@Entity('approval_workflows')
@Index(['company_id', 'request_module', 'workflow_name'], { unique: true })
export class ApprovalWorkflow extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: string;

  @Field()
  @Column()
  workflow_name: string;

  @Field()
  @Column()
  request_module: string; // 'overtime' | 'leave' | 'adjustment' | 'work_location'

  @Field({ defaultValue: true })
  @Column({ default: true })
  is_active: boolean;

  // Relations
  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => [ApprovalWorkflowStep], { nullable: 'items' })
  @OneToMany(() => ApprovalWorkflowStep, (step) => step.workflow)
  steps: ApprovalWorkflowStep[];
}