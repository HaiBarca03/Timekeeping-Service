import { Entity, Column, ManyToOne, JoinColumn, Index, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { ShiftRule } from './shift-rule.entity';
import { ShiftRestRule } from './shift-rest-rule.entity';
import { ShiftField } from './shift-field.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('shifts')
@Index(['companyId', 'shiftName'], { unique: true })
export class Shift extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'shift_name', type: 'varchar' })
  shiftName: string;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => ShiftRule, { nullable: true })
  @OneToOne(() => ShiftRule, (rule) => rule.shift)
  rule: ShiftRule;

  @Field(() => [ShiftRestRule], { nullable: 'itemsAndList' })
  @OneToMany(() => ShiftRestRule, (restRule) => restRule.shift)
  restRules: ShiftRestRule[];

  @Field(() => [ShiftField], { nullable: 'itemsAndList' })
  @OneToMany(() => ShiftField, (field) => field.shift)
  fields: ShiftField[];
}