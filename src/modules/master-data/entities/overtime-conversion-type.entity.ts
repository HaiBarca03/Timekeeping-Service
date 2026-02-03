import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
@Entity('overtime_conversion_types')
@Index(['companyId', 'conversionName'], { unique: true })
export class OvertimeConversionType extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'conversion_name', type: 'varchar' })
  conversionName: string;

  @Field(() => Float)
  @Column({ name: 'multiplier', type: 'decimal', precision: 5, scale: 2 })
  multiplier: number;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}