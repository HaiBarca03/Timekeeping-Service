import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Shift } from './shift.entity';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('shift_rules')
@Index(['shiftId'], { unique: true })
export class ShiftRule extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @Field({ nullable: true })
  @Column({ name: 'on_time', type: 'time', nullable: true })
  onTime: string;

  @Field({ nullable: true })
  @Column({ name: 'off_time', type: 'time', nullable: true })
  offTime: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'on_advance_minutes', type: 'int', nullable: true })
  onAdvanceMinutes: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'off_delay_minutes', type: 'int', nullable: true })
  offDelayMinutes: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'late_minutes_as_late', type: 'int', nullable: true })
  lateMinutesAsLate: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'late_minutes_as_lack', type: 'int', nullable: true })
  lateMinutesAsLack: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'early_minutes_as_early', type: 'int', nullable: true })
  earlyMinutesAsEarly: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'early_minutes_as_lack', type: 'int', nullable: true })
  earlyMinutesAsLack: number;

  @Field(() => Shift, { nullable: true })
  @OneToOne(() => Shift, (shift) => shift.rule)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}