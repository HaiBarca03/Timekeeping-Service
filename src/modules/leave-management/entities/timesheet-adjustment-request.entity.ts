import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { TimesheetAdjustmentRequestItem } from './timesheet-adjustment-request-item.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { Company } from '../../master-data/entities/company.entity';
import { TimesheetAdjustmentType } from '../../master-data/entities/timesheet-adjustment-type.entity';

@ObjectType()
@Entity('timesheet_adjustment_requests')
export class TimesheetAdjustmentRequest extends BaseEntity {
  @Field(() => ID) @Column({ type: 'bigint' }) company_id: number;
  @Field(() => ID) @Column({ type: 'bigint' }) requester_id: number;
  @Field(() => ID) @Column({ type: 'bigint' }) adjustment_type_id: number;

  @Field() @Column() status: string;
  @Field() @Column({ type: 'date' }) date_of_error: Date;
  @Field({ nullable: true }) @Column({ type: 'text', nullable: true }) original_record: string;
  @Field({ nullable: true }) @Column({ type: 'timestamp', nullable: true }) replenishment_time: Date;

  @Field(() => [TimesheetAdjustmentRequestItem], { nullable: 'items' })
  @OneToMany(() => TimesheetAdjustmentRequestItem, (item) => item.request)
  items: TimesheetAdjustmentRequestItem[];

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requester_id' })
  requester: Employee;

  @Field(() => TimesheetAdjustmentType)
  @ManyToOne(() => TimesheetAdjustmentType)
  @JoinColumn({ name: 'adjustment_type_id' })
  adjustment_type: TimesheetAdjustmentType;
}