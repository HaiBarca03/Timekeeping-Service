import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('attendance_methods')
@Index(['companyId', 'methodName'], { unique: true })
export class AttendanceMethod extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'method_name', type: 'varchar' })
  methodName: string;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}