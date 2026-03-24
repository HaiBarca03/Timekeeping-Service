import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('employee_types')
@Index(['companyId', 'code'], { unique: true })
export class EmployeeType extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Index()
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'type_name', type: 'varchar' })
  typeName: string;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
