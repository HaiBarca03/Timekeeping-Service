import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { QUEUE_NAMES } from '../../constants/queue.constants';
import { RedisModule } from 'src/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { AttendanceEngineModule } from '../attendance/engine/attendance-engine.module';
import { AttendancePunchRecord } from '../attendance/entities/attendance-punch-record.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataModule } from '../master-data/master-data.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceProcessor } from './processor/attendance.processor';
import { CalculateDailyProcessor } from './processor/calculate-daily.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    MasterDataModule, // Company
    AttendanceModule,
    TypeOrmModule.forFeature([AttendancePunchRecord]),
    RedisModule,
    // BullModule.registerQueue({
    //   name: QUEUE_NAMES.ATTENDANCE,
    // }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CALCULATE_DAILY,
    }),
  ],
  providers: [AttendanceProcessor, CalculateDailyProcessor],
})
export class WorkerModule {}
