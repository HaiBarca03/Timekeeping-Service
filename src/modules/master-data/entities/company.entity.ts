import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AttendanceMonthSetting } from '../../attendance/entities/attendance-month-setting.entity';
import { AttendanceMonthlyTimesheet } from '../../attendance/entities/attendance-monthly-timesheet.entity';
import { AttendancePunchRecord } from '../../attendance/entities/attendance-punch-record.entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { Employee } from './employee.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';

@ObjectType()
@Entity('companies')
export class Company extends BaseEntity {
  @Field()
  @Column({ name: 'company_name', type: 'varchar' })
  companyName: string;

  @Field(() => [AttendanceDailyTimesheet], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendanceDailyTimesheet, ts => ts.company)
  attendanceTimesheets: AttendanceDailyTimesheet[];

  @Field(() => [AttendanceMonthSetting], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendanceMonthSetting, setting => setting.company) 
  attendanceMonthSettings: AttendanceMonthSetting[];

  @Field(() => [AttendanceMonthlyTimesheet], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendanceMonthlyTimesheet, ts => ts.company)
  attendanceMonthlyTimesheets: AttendanceMonthlyTimesheet[];

  @Field(() => [AttendancePunchRecord], { nullable: 'itemsAndList' })
  @OneToMany(() => AttendancePunchRecord, rec => rec.company)
  attendancePunchRecords: AttendancePunchRecord[];

  @Field(() => [Employee], { nullable: 'itemsAndList' }) 
  @OneToMany(() => Employee, employee => employee.company)
  employees: Employee[];
}