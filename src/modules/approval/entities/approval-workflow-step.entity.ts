import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { ApprovalWorkflow } from './approval-workflow.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { JobLevel } from '../../master-data/entities/job-level.entity';

@ObjectType()
@Entity('approval_workflow_steps')
@Index(['workflow_id', 'step_order'], { unique: true })
export class ApprovalWorkflowStep extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  workflow_id: number;

  @Field(() => Int)
  @Column()
  step_order: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  step_name: string;

  @Field()
  @Column()
  approver_type: string; // 'manager' | 'hr' | 'specific_employee' | 'job_level'

  @Field(() => ID, { nullable: true })
  @Column({ type: 'bigint', nullable: true })
  approver_employee_id: number;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'bigint', nullable: true })
  approver_job_level_id: number;

  @Field({ defaultValue: true })
  @Column({ default: true })
  is_required: boolean;

  // Relations
  @Field(() => ApprovalWorkflow)
  @ManyToOne(() => ApprovalWorkflow, (workflow) => workflow.steps)
  @JoinColumn({ name: 'workflow_id' })
  workflow: ApprovalWorkflow;

  @Field(() => Employee, { nullable: true })
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'approver_employee_id' })
  approver_employee: Employee;

  @Field(() => JobLevel, { nullable: true })
  @ManyToOne(() => JobLevel)
  @JoinColumn({ name: 'approver_job_level_id' })
  approver_job_level: JobLevel;
}