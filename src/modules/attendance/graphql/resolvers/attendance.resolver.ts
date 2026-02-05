import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AttendancePunchRecord } from '../../entities/attendance-punch-record.entity';
import { RawPunchInput } from '../inputs/raw-punch.input';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants';
import { BatchPunchResult } from '../types/batch-punch-response';

@Resolver()
export class AttendanceResolver {
  constructor(
    @InjectRepository(AttendancePunchRecord)
    private punchRecordRepo: Repository<AttendancePunchRecord>,

    @InjectQueue(QUEUE_NAMES.ATTENDANCE) 
    private attendanceQueue: Queue,
  ) {}

  @Mutation(() => BatchPunchResult)
  async receiveBatchPunch(
    @Args({ name: 'inputs', type: () => [RawPunchInput] }) inputs: RawPunchInput[],
  ): Promise<BatchPunchResult> {
    
    // 1. Bulk Insert vào Database (nhanh hơn save từng record)
    // Dùng .insert() để tối ưu tốc độ nếu không cần hooks của TypeORM
    const entities = inputs.map(input => this.punchRecordRepo.create({
      ...input,
      company_id: input.company_id.toString(),
      employee_id: input.employee_id.toString(),
      raw_payload: input
    }));

    const result = await this.punchRecordRepo.insert(entities);
    const savedIds = result.identifiers.map(id => id.id);

    // 2. Gom nhóm theo (employee + date) để tránh tính toán trùng lặp quá nhiều trong worker
    // Ví dụ: 1 người có 2 punch trong 1 ngày thì chỉ cần trigger tính toán ngày đó 1 lần
    const calculationJobs = inputs.map(input => ({
      employee_id: input.employee_id,
      date: new Date(input.punch_time).toISOString().split('T')[0], // yyyy-mm-dd
    }));

    // Loại bỏ trùng lặp (nếu cần) để tối ưu worker
    const uniqueJobs = Array.from(new Set(calculationJobs.map(j => JSON.stringify(j))))
                            .map(s => JSON.parse(s));

    // 3. Đẩy vào BullMQ (BullMQ sẽ tự động dùng Redis)
    // Bulk add jobs để tối ưu network
    await this.attendanceQueue.addBulk(
      uniqueJobs.map(job => ({
        name: JOB_NAMES.CALCULATE_DAILY,
        data: job,
        opts: {
          removeOnComplete: true,
          jobId: `calc-${job.employee_id}-${job.date}`,
        },
      }))
    );

    return {
      savedCount: savedIds.length,
      savedIds: savedIds.map(String),
      message: 'Batch punches recorded and queued for calculation.',
    };
  }
}