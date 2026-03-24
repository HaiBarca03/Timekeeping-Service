import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveManagementModule } from './modules/approval-management/approval-management.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    DatabaseModule,
    MasterDataModule,
    AttendanceModule,
    LeaveManagementModule,
  ],
  providers: [
    // Logger,
    HealthController,
  ],
})
export class AppModule {}
