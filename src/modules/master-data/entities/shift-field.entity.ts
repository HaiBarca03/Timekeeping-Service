import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Shift } from './shift.entity';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('shift_fields')
@Index(['shiftId', 'fieldName'], { unique: true })
export class ShiftField extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @Field({ nullable: true })
  @Column({ name: 'field_name', type: 'varchar', nullable: true })
  fieldName: string;

  @Field()
  @Column({ name: 'is_flexible', type: 'boolean', default: false })
  isFlexible: boolean;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'punch_time_number', type: 'int', nullable: true })
  punchTimeNumber: number;

  @Field()
  @Column({ name: 'no_need_off', type: 'boolean', default: false })
  noNeedOff: boolean;

  @Field(() => Shift, { nullable: true })
  @ManyToOne(() => Shift, (shift) => shift.fields)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}