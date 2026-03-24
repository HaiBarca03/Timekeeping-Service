// import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
// import { BaseEntity } from '../../../database/entities/base.entity';
// import { TimesheetAdjustmentRequestItem } from './timesheet-adjustment-request-item.entity';
// import { Employee } from '../../master-data/entities/employee.entity';
// import { Company } from '../../master-data/entities/company.entity';
// import { TimesheetAdjustmentType } from '../../master-data/entities/timesheet-adjustment-type.entity';

// @Entity('timesheet_adjustment_requests')
// export class TimesheetAdjustmentRequest extends BaseEntity {
//   @Column({ type: 'bigint' })
//   company_id: string;

//   @Column({ type: 'bigint' })
//   requester_id: string;

//   @Column({ type: 'bigint' })
//   adjustment_type_id: string;

//   @Column()
//   status: string;

//   @Column({ type: 'date' })
//   date_of_error: Date;

//   @Column({ type: 'text', nullable: true })
//   original_record: string;

//   @Column({ type: 'timestamp', nullable: true })
//   replenishment_time: Date;

//   // --- Relationships ---

//   @OneToMany(() => TimesheetAdjustmentRequestItem, (item) => item.request)
//   items: TimesheetAdjustmentRequestItem[];

//   @ManyToOne(() => Company)
//   @JoinColumn({ name: 'company_id' })
//   company: Company;

//   @ManyToOne(() => Employee)
//   @JoinColumn({ name: 'requester_id' })
//   requester: Employee;

//   @ManyToOne(() => TimesheetAdjustmentType)
//   @JoinColumn({ name: 'adjustment_type_id' })
//   adjustment_type: TimesheetAdjustmentType;
// }
