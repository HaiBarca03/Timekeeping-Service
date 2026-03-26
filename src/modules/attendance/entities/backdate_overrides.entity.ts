import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';

@Entity('backdate_overrides')
@Index(['effective_from', 'effective_to'])
@Index(['entity_type', 'entity_id'])
export class BackdateOverride extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  company_id: string;

  @Column({ type: 'date' })
  effective_from: Date; // Ngày bắt đầu áp dụng ngược

  @Column({ type: 'date', nullable: true })
  effective_to: Date | null; // NULL = Áp dụng mãi mãi từ ngày from

  @Column({ length: 50 })
  entity_type: string; // 'SHIFT', 'ATTENDANCE_GROUP', 'EMPLOYEE'

  @Column({ type: 'varchar', length: 100 })
  entity_id: string; // OriginID của đối tượng tương ứng

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  source_id: string; // ID từ hệ thống nguồn để track và update

  @Column({ type: 'jsonb' })
  override_values: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 'PENDING' })
  recalc_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}
