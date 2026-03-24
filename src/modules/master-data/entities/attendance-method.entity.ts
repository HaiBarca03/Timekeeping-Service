import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('attendance_methods')
@Index(['companyId', 'methodName'], { unique: true })
export class AttendanceMethod extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'method_name', type: 'varchar' })
  methodName: string;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
