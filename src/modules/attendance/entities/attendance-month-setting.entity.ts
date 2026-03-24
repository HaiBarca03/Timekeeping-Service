import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';

@Entity('attendance_month_settings')
@Index(['company_id', 'month', 'year'], { unique: true })
export class AttendanceMonthSetting extends BaseEntity {
  @Column({ type: 'bigint' })
  company_id: string;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  standard_workdays: number;

  @Column({ type: 'date', nullable: true })
  closing_date?: Date | null;

  @ManyToOne(() => Company, (company) => company.attendanceMonthSettings)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
