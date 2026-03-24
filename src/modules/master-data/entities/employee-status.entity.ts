import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('employee_statuses')
@Index(['companyId', 'statusName'], { unique: true })
export class EmployeeStatus extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Index()
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'status_name', type: 'varchar' })
  statusName: string;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
