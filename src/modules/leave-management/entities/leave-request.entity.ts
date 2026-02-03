import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { Company } from '../../master-data/entities/company.entity';
import { LeaveType } from '../../master-data/entities/leave-type.entity';
import { LeaveRequestItem } from './leave-request-item.entity';

@ObjectType()
@Entity('leave_requests')
@Index(['company_id', 'employee_id', 'submitted_at'])
@Index(['company_id', 'status'])
export class LeaveRequest extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: number;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  requester_id: number;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  employee_id: number;

  @Field(() => ID)
  @Column({ type: 'bigint' })
  leave_type_id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  leave_type_detail: string;

  @Field()
  @Column()
  status: string; // draft/submitted/approved/rejected/canceled

  @Field()
  @Column({ type: 'timestamp' })
  submitted_at: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Field()
  @Column({ type: 'timestamp' })
  start_time: Date;

  @Field()
  @Column({ type: 'timestamp' })
  end_time: Date;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  reason: string;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  leave_hours: number;

  /* =========================
     RELATIONS (TypeORM + GraphQL)
  ========================= */

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requester_id' })
  requester: Employee;

  @Field(() => Employee)
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Field(() => LeaveType)
  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leave_type_id' })
  leave_type: LeaveType;

  @Field(() => [LeaveRequestItem], { nullable: 'items' })
  @OneToMany(() => LeaveRequestItem, (item) => item.request)
  items: LeaveRequestItem[];
}