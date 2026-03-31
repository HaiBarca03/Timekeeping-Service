import { BaseEntity } from "../../../database/entities/base.entity";
import { Employee } from "../../master-data/entities/employee.entity";
import { Shift } from "../../master-data/entities/shift.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

@Entity('shift_assignments')
@Index(['employeeId', 'date'])
export class ShiftAssignment extends BaseEntity {

  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'employee_id', type: 'bigint' })
  employeeId: string;

  @Column({ name: 'store_id', type: 'varchar' })
  storeId: string;

  @Index({ unique: true })
  @Column({ name: 'origin_id', type: 'varchar', unique: true, nullable: true })
  originId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @Column({ name: 'on_time', type: 'timestamptz' })
  onTime: Date;

  @Column({ name: 'off_time', type: 'timestamptz' })
  offTime: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /* relations */

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}