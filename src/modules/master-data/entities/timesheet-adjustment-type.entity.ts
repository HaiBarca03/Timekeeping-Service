import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('timesheet_adjustment_types')
@Index(['companyId', 'adjustmentTypeName'], { unique: true })
export class TimesheetAdjustmentType extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'adjustment_type_name', type: 'varchar' })
  adjustmentTypeName: string;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
