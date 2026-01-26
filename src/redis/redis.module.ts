import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          
          maxRetriesPerRequest: null, 
        },
        defaultJobOptions: {
          removeOnComplete: true, 
          removeOnFail: { age: 24 * 3600 }, 
          attempts: 3, 
          backoff: {
            type: 'exponential',
            delay: 5000, 
          },
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class RedisModule {}