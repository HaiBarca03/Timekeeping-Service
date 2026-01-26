import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { QUEUE_NAMES } from '../../constants/queue.constants';
import { RedisModule } from 'src/redis/redis.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // DatabaseModule,      
    RedisModule,   
    BullModule.registerQueue({
      name: QUEUE_NAMES.ATTENDANCE,
    }),
  ],
  providers: [],
})
export class WorkerModule {}