import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('job_levels')
@Index(['companyId', 'code'], { unique: true }) 
export class JobLevel extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string; 

  @Field()
  @Column({ name: 'level_name', type: 'varchar' })
  levelName: string; 

  @Field()
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}