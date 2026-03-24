import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { Employee } from './employee.entity';

export enum DepartmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('departments')
@Index(['companyId', 'departmentName'], { unique: true })
export class Department extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Index({ unique: true })
  @Column({ name: 'origin_id', type: 'varchar', unique: true, nullable: true })
  originId: string;

  @Column({ name: 'department_name', type: 'varchar' })
  departmentName: string;

  @Column({ name: 'department_code', type: 'varchar', nullable: true })
  departmentCode: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DepartmentStatus.ACTIVE,
  })
  status: DepartmentStatus;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Department, (d) => d.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Department;

  @OneToMany(() => Department, (d) => d.parent)
  children: Department[];

  @ManyToMany(() => Employee, (employee) => employee.departments)
  employees: Employee[];
}
