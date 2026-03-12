import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveManagementModule } from './modules/leave-management/leave-management.module';
import { HealthResolver } from './health.resolver';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      formatError: (error) => {
        const originalError = error.extensions?.originalError as any;
        return {
          message: error.message,
          businessCode: originalError?.businessCode || -1,
          code: error.extensions?.code,
          path: error.path,
        };
      },
    }),
  ],
  providers: [
    // Logger,
    HealthResolver
  ],
})
export class AppModule {}
