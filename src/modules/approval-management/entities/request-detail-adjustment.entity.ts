import { BaseEntity } from "../../../database/entities/base.entity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { AttendanceRequest } from "./attendance-request.entity";

@Entity('request_detail_adjustment')
export class RequestDetailAdjustment extends BaseEntity {

  @Column()
  attendance_request_id: string;

  // --- Correction ---
  @Column({ type: 'varchar', nullable: true })
  original_record: string; 

  @Column({ type: 'timestamp', nullable: true })
  replenishment_time: Date;

  // --- Maternity ---
  @Column({ nullable: true })
  maternity_shift: string;

  // Nếu thai sản áp dụng cho một khoảng thời gian
  @Column({ type: 'date', nullable: true })
  maternity_start_date: Date;

  @Column({ type: 'date', nullable: true })
  maternity_end_date: Date;

  // --- Swap ---
  @Column({ nullable: true })
  employee_id_swap: string;

  @Column({ type: 'date', nullable: true })
  date_original_shift: Date; // Ngày gốc cần đổi

  @Column({ type: 'date', nullable: true })
  date_swap_shift: Date;     // Ngày đổi sang

  @OneToOne(() => AttendanceRequest, (req) => req.detail_adjustment)
  @JoinColumn({ name: 'attendance_request_id' })
  request: AttendanceRequest;
}