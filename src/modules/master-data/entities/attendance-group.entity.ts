import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { Shift } from './shift.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql'; 

@ObjectType()
@Entity('attendance_groups')
@Index(['companyId', 'groupName'], { unique: true })
export class AttendanceGroup extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field() 
  @Column({ name: 'group_name', type: 'varchar' })
  groupName: string;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'default_shift_id', type: 'bigint', nullable: true })
  defaultShiftId: string;

  // Quan hệ (Relations)
  @Field(() => Company, { nullable: true })
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Shift, { nullable: true })
  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'default_shift_id' })
  defaultShift: Shift;
}