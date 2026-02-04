import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AttendancePunchRecord } from '../../entities/attendance-punch-record.entity';
import { RawPunchInput } from '../inputs/raw-punch.input';
import { AttendanceEngine } from '../../engine/attendance.engine';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Resolver(() => AttendancePunchRecord)
export class AttendanceResolver {
  constructor(
    private attendanceEngine: AttendanceEngine,

    @InjectRepository(AttendancePunchRecord)
    private punchRecordRepo: Repository<AttendancePunchRecord>,
  ) {}

  /**
   * Mutation nhận raw punch log (từ Lark webhook hoặc hệ thống khác)
   * - Lưu raw punch vào DB
   * - Trigger tính lại công ngày cho nhân viên (realtime)
   * - Trả về punch record vừa lưu
   */
  @Mutation(() => AttendancePunchRecord)
  async receiveRawPunch(
    @Args('input') input: RawPunchInput,
  ): Promise<AttendancePunchRecord> {
    // 1. Tạo entity từ input
    const rawPunch = this.punchRecordRepo.create({
      company_id: input.company_id.toString(), // vì entity dùng string cho bigint
      employee_id: input.employee_id.toString(),
      lark_record_id: input.lark_record_id,
      punch_time: input.punch_time,
      punch_type: input.punch_type,
      punch_result: input.punch_result,
      source_type: input.source_type,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      raw_payload: input.raw_payload,
      // daily_timesheet_id: để null, engine sẽ update sau
    });

    // 2. Lưu raw punch vào DB
    const savedPunch = await this.punchRecordRepo.save(rawPunch);

    // 3. Trigger engine tính công ngày (dùng punch_time làm date)
    const punchDate = new Date(input.punch_time);
    punchDate.setHours(0, 0, 0, 0); // normalize về đầu ngày

    await this.attendanceEngine.calculateDailyForEmployee(
      input.employee_id,
      punchDate,
    );

    // 4. Trả về record vừa lưu (có thể thêm message success)
    return savedPunch;
  }
}