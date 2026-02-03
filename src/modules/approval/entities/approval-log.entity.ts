import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { ApprovalWorkflow } from './approval-workflow.entity';
import { ApprovalWorkflowStep } from './approval-workflow-step.entity';

@ObjectType()
@Entity('approval_logs')
@Index(['company_id', 'request_module', 'request_id'])
@Index(['workflow_id', 'workflow_step_id'])
@Index(['acted_by_employee_id', 'acted_at'])
export class ApprovalLog extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: number;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'bigint', nullable: true })
  workflow_id: number;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'bigint', nullable: true })
  workflow_step_id: number;

  @Field()
  @Column()
  request_module: string; // 'overtime' | 'leave' | 'adjustment' | 'work_location'

  @Field(() => ID)
  @Column({ type: 'bigint' })
  request_id: number; // ID của bản ghi request tương ứng

  @Field()
  @Column()
  action: string; // 'submitted' | 'approved' | 'rejected' | 'canceled'

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  action_note: string;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'bigint', nullable: true })
  acted_by_employee_id: number;

  @Field()
  @Column({ type: 'timestamp' })
  acted_at: Date;

  // Relations
  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee, { nullable: true })
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'acted_by_employee_id' })
  acted_by: Employee;

  @Field(() => ApprovalWorkflow, { nullable: true })
  @ManyToOne(() => ApprovalWorkflow)
  @JoinColumn({ name: 'workflow_id' })
  workflow: ApprovalWorkflow;

  @Field(() => ApprovalWorkflowStep, { nullable: true })
  @ManyToOne(() => ApprovalWorkflowStep)
  @JoinColumn({ name: 'workflow_step_id' })
  workflow_step: ApprovalWorkflowStep;
}