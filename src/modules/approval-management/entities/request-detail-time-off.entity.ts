import { BaseEntity } from "../../../database/entities/base.entity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { AttendanceRequest } from "./attendance-request.entity";

@Entity('request_detail_time_off')
export class RequestDetailTimeOff extends BaseEntity {

  @Column()
  attendance_request_id: string; 

  @Column({ 
    type: 'bigint', 
    nullable: true, 
    name: 'leave_type_id' 
  })
  leave_type_id: string | null;

  @Column({ nullable: true })
  leave_type_details: string;

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp' })
  end_time: Date;

  @Column({ type: 'float' })
  hours: number;

  @OneToOne(() => AttendanceRequest, (req) => req.detail_time_off)
  @JoinColumn({ name: 'attendance_request_id' })
  request: AttendanceRequest;
}