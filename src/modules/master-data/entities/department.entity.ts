import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  ManyToMany,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { Employee } from './employee.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

export enum DepartmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@ObjectType()
@Entity('departments')
@Index(['companyId', 'departmentName'], { unique: true })
export class Department extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'department_name', type: 'varchar' })
  departmentName: string;

  @Field({ nullable: true })
  @Column({ name: 'department_code', type: 'varchar', nullable: true })
  departmentCode: string;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string;

  @Field(() => String)
  @Column({
    type: 'varchar',
    length: 20,
    default: DepartmentStatus.ACTIVE,
  })
  status: DepartmentStatus;
  
  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Field(() => Department, { nullable: true })
  @ManyToOne(() => Department, (d) => d.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Department;

  @Field(() => [Department], { nullable: 'itemsAndList' })
  @OneToMany(() => Department, (d) => d.parent)
  children: Department[];

  @Field(() => [Employee], { nullable: 'itemsAndList' })
  @ManyToMany(() => Employee, (employee) => employee.departments)
  employees: Employee[];
}