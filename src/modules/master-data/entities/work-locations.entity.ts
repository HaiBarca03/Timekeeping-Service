import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('work_locations')
@Index(['companyId', 'locationName'], { unique: true })
export class WorkLocation extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'location_name', type: 'varchar' })
  locationName: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  @Column({
    name: 'latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitude: number;

  @Column({
    name: 'longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitude: number;

  @Column({ name: 'radius_meters', type: 'int', default: 200 })
  radiusMeters: number;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
