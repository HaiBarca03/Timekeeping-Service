import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Shift } from './shift.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('shift_rest_rules')
@Index(['shiftId', 'restBeginTime', 'restEndTime'], { unique: true })
export class ShiftRestRule extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @Field({ nullable: true })
  @Column({ name: 'rest_begin_time', type: 'time', nullable: true })
  restBeginTime: string; // Kiểu 'time' trong Postgres trả về string "HH:mm:ss"

  @Field({ nullable: true })
  @Column({ name: 'rest_end_time', type: 'time', nullable: true })
  restEndTime: string;

  @Field(() => Shift, { nullable: true })
  @ManyToOne(() => Shift, (shift) => shift.restRules)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}