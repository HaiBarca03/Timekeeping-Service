import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { AttendanceMonthSetting } from '../../attendance/entities/attendance-month-setting.entity';
import { AttendanceMonthlyTimesheet } from '../../attendance/entities/attendance-monthly-timesheet.entity';
import { AttendancePunchRecord } from '../../attendance/entities/attendance-punch-record.entity';
import { Employee } from './employee.entity';
import { AttendanceDailyTimesheet } from '../../attendance/entities/attendance-daily-timesheet.entity';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ name: 'company_name', type: 'varchar' })
  companyName: string;

  @Index({ unique: true })
  @Column({ name: 'origin_id', type: 'varchar', unique: true, nullable: true })
  originId: string;

  // --- Relationships ---

  @OneToMany(() => AttendanceDailyTimesheet, (ts) => ts.company)
  attendanceTimesheets: AttendanceDailyTimesheet[];

  @OneToMany(() => AttendanceMonthSetting, (setting) => setting.company)
  attendanceMonthSettings: AttendanceMonthSetting[];

  @OneToMany(() => AttendanceMonthlyTimesheet, (ts) => ts.company)
  attendanceMonthlyTimesheets: AttendanceMonthlyTimesheet[];

  @OneToMany(() => AttendancePunchRecord, (rec) => rec.company)
  attendancePunchRecords: AttendancePunchRecord[];

  @OneToMany(() => Employee, (employee) => employee.company)
  employees: Employee[];
}
