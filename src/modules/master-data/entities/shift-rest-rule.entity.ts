import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Shift } from './shift.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('shift_rest_rules')
@Index(['restBeginTime', 'restEndTime'], { unique: true })
export class ShiftRestRule extends BaseEntity {
  @Field({ nullable: true })
  @Column({ name: 'rest_begin_time', type: 'time', nullable: true })
  restBeginTime: string;

  @Field({ nullable: true })
  @Column({ name: 'rest_end_time', type: 'time', nullable: true })
  restEndTime: string;

  @Field(() => [Shift], { nullable: true })
  @OneToMany(() => Shift, (shift) => shift.restRule)
  shifts: Shift[];
}
