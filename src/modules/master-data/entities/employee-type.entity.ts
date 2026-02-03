import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('employee_types')
@Index(['companyId', 'typeName'], { unique: true })
export class EmployeeType extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'type_name', type: 'varchar' })
  typeName: string;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}