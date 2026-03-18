import { Entity, Column, ManyToOne, JoinColumn, Index, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
// import { ShiftRule } from './shift-rule.entity';
import { ShiftRestRule } from './shift-rest-rule.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('shifts')
@Index(['companyId', 'shiftName'], { unique: true })
@Index(['companyId', 'code'], { unique: true })
export class Shift extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string

  @Field()
  @Column({ name: 'shift_name', type: 'varchar' })
  shiftName: string;

  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Date)
  @Column({ name: 'start_time', type: 'timestamptz' }) 
  startTime: Date;

  @Field(() => Date)
  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Field(() => Number, { defaultValue: 0 })
  @Column({ name: 'allow_late_minutes', type: 'int', default: 0 })
  allowLateMinutes: number; // Số phút cho phép đi muộn

  @Field(() => Number, { defaultValue: 0 })
  @Column({ name: 'allow_early_minutes', type: 'int', default: 0 })
  allowEarlyMinutes: number; // Số phút cho phép về sớm

  @Field(() => Number)
  @Column({ name: 'shift_hours', type: 'float', default: 8 })
  shiftHours: number;

  // @Field(() => ShiftRule, { nullable: true })
  // @OneToOne(() => ShiftRule, (rule) => rule.shift)
  // rule: ShiftRule;

  @Field(() => [ShiftRestRule], { nullable: 'itemsAndList' })
  @OneToMany(() => ShiftRestRule, (restRule) => restRule.shift)
  restRules: ShiftRestRule[];
}