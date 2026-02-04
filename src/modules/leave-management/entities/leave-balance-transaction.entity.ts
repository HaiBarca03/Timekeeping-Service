import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { LeaveType } from '../../master-data/entities/leave-type.entity';
import { Company } from '../../master-data/entities/company.entity';

@ObjectType()
@Entity('leave_balance_transactions')
@Index(['company_id', 'employee_id', 'transaction_date'])
export class LeaveBalanceTransaction extends BaseEntity {
  @Field(() => ID) @Column({ type: 'bigint' }) company_id: string;
  @Field(() => ID) @Column({ type: 'bigint' }) employee_id: string;
  @Field(() => ID) @Column({ type: 'bigint' }) leave_type_id: string;

  @Field()
  @Column({ type: 'date' })
  transaction_date: Date;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  change_days: number; 

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => LeaveType)
  @ManyToOne(() => LeaveType)
  @JoinColumn({ name: 'leave_type_id' })
  leave_type: LeaveType;
}