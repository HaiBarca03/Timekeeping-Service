import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('leave_types')
@Index(['companyId', 'leaveTypeName'], { unique: true })
export class LeaveType extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'leave_type_name', type: 'varchar' })
  leaveTypeName: string;

  @Field()
  @Column({ name: 'is_deduct_leave', type: 'boolean', default: true })
  isDeductLeave: boolean;

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}