import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import 'dotenv/config';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const useSsl = process.env.DATABASE_SSL_ENABLED === 'true';
    const hasUrl = !!process.env.DATABASE_URL?.trim();

    return {
      type: 'postgres',

      ...(hasUrl
        ? {
          url: process.env.DATABASE_URL,
        }
        : {
          type: (process.env.DATABASE_TYPE as any) || 'postgres',
          host: process.env.DATABASE_HOST,
          port: process.env.DATABASE_PORT
            ? parseInt(process.env.DATABASE_PORT, 10)
            : 5432,
          username: process.env.DATABASE_USERNAME,
          password: process.env.DATABASE_PASSWORD,
          database: process.env.DATABASE_NAME,
        }),

      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
      dropSchema: false,
      logging: process.env.NODE_ENV !== 'production',

      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],

      ssl: useSsl
        ? {
          rejectUnauthorized:
            process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
          ca: process.env.DATABASE_CA || undefined,
          key: process.env.DATABASE_KEY || undefined,
          cert: process.env.DATABASE_CERT || undefined,
        }
        : false,

      extra: {
        max: process.env.DATABASE_MAX_CONNECTIONS
          ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
          : 20,
      },
    };
  }
}