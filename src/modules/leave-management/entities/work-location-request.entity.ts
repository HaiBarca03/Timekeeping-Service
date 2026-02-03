import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { WorkLocationRequestType } from '../../master-data/entities/work-location-request-type.entity';
import { WorkLocationRequestItem } from './work-location-request-item.entity';

@ObjectType()
@Entity('work_location_requests')
export class WorkLocationRequest extends BaseEntity {
  @Field(() => ID) @Column({ type: 'bigint' }) company_id: number;
  @Field(() => ID) @Column({ type: 'bigint' }) requester_id: number;
  @Field(() => ID) @Column({ type: 'bigint' }) request_type_id: number; // remote/onsite...

  @Field() @Column() status: string;
  @Field() @Column({ type: 'timestamp' }) start_time: Date;
  @Field() @Column({ type: 'timestamp' }) end_time: Date;
  @Field({ nullable: true }) @Column({ nullable: true }) location: string;

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Employee)
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requester_id' })
  requester: Employee;

  @Field(() => WorkLocationRequestType)
  @ManyToOne(() => WorkLocationRequestType)
  @JoinColumn({ name: 'request_type_id' })
  request_type: WorkLocationRequestType;

  @Field(() => [WorkLocationRequestItem], { nullable: 'items' })
  @OneToMany(() => WorkLocationRequestItem, (item) => item.request)
  items: WorkLocationRequestItem[];
}