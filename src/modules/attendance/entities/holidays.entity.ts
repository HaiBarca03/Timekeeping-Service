import { BaseEntity } from "../../../database/entities/base.entity";
import { Column, Entity } from "typeorm";
import { HOLIDAY_TYPES } from "../../../constants/holiday-type.constants";
@Entity('holidays')
export class Holiday extends BaseEntity {
  @Column({ type: 'varchar' })
  holiday_name: string;

  @Column({ type: 'date' })
  holiday_date: Date;

  @Column({
    type: 'varchar',
    length: 50, // Giới hạn độ dài chuỗi cho an toàn
    default: HOLIDAY_TYPES.PUBLIC
  })
  holiday_type: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  workday_value: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ name: 'company_id', type: 'bigint', nullable: true })
  companyId: string;
}