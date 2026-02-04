import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';


@ObjectType()
@Entity('attendance_month_settings')
@Index(['company_id', 'month', 'year'], { unique: true })
export class AttendanceMonthSetting extends BaseEntity {
  @Field(() => ID)
  @Column({ type: 'bigint' })
  company_id: string;

  @Field()
  @Column()
  month: number;

  @Field()
  @Column()
  year: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  standard_workdays: number;

  @Field({ nullable: true })
  @Column({ type: 'date', nullable: true })
  closing_date: Date;

  @Field(() => Company)
  @ManyToOne(() => Company, company => company.attendanceMonthSettings)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}