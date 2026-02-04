import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';
import { OvertimeConversionType } from '../../master-data/entities/overtime-conversion-type.entity';
import { Shift } from '../../master-data/entities/shift.entity';
import { Company } from '../../master-data/entities/company.entity';
import { Employee } from '../../master-data/entities/employee.entity';

@ObjectType()
@Entity('overtime_request')
export class OvertimeRequest extends BaseEntity {
  @Field(() => ID) @Column({ type: 'bigint' }) company_id: string;
  @Field(() => ID) @Column({ type: 'bigint' }) requester_id: string;
  @Field(() => ID, { nullable: true }) @Column({ type: 'bigint', nullable: true }) shift_id: string;
  @Field(() => ID, { nullable: true }) @Column({ type: 'bigint', nullable: true }) daily_timesheet_id: string;
  @Field(() => ID) @Column({ type: 'bigint' }) conversion_type_id: string;

  @Field() @Column() status: string;
  @Field() @Column({ type: 'timestamp' }) start_time: Date;
  @Field() @Column({ type: 'timestamp' }) end_time: Date;
  @Field({ nullable: true }) @Column({ type: 'text', nullable: true }) overtime_reason: string;

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requester_id' })
  requester: Employee;

  @Field(() => Shift, { nullable: true })
  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Field(() => AttendanceDailyTimesheet, { nullable: true })
  @ManyToOne(() => AttendanceDailyTimesheet)
  @JoinColumn({ name: 'daily_timesheet_id' })
  daily_timesheet: AttendanceDailyTimesheet;

  @Field(() => OvertimeConversionType)
  @ManyToOne(() => OvertimeConversionType)
  @JoinColumn({ name: 'conversion_type_id' })
  conversion_type: OvertimeConversionType;
}