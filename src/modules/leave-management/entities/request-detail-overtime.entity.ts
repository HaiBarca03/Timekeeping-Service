import { BaseEntity } from "../../../database/entities/base.entity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { AttendanceRequest } from "./attendance-request.entity";

@Entity('request_detail_overtime')
export class RequestDetailOvertime extends BaseEntity {

  @Column()
  attendance_request_id: string;

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp' })
  end_time: Date;

  @Column({ nullable: true })
  convert_type: string; // Lương tăng ca / Nghỉ bù

  @Column()
  ot_rule_id: number;

  @Column({ type: 'float', default: 1.0 })
  ratio_convert: number; // Hệ số (1.5, 2.0...)

  @Column({ type: 'float' })
  hours_ratio: number; // Giờ đã nhân hệ số

  @OneToOne(() => AttendanceRequest, (req) => req.detail_overtime)
  @JoinColumn({ name: 'attendance_request_id' })
  request: AttendanceRequest;
}