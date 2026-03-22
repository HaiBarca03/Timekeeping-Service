import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import _ from 'lodash';
import {
  isNumber,
  isObject,
  isString,
} from '@nestjs/common/utils/shared.utils';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: null, // cần cho BullMQ
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error: ' + error?.message);
    });
  }

  // ================= BASIC =================

  async setParse(key: string, value: any, mexp: number = -1) {
    const setValue = isObject(value) ? { ...value, _cache: true } : value;

    const data = JSON.stringify(setValue);

    if (mexp > 0) {
      return this.client.set(key, data, 'PX', mexp);
    }

    return this.client.set(key, data);
  }

  async getParse<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  // ================= HASH =================

  async hSetParse(key: string, value: Record<string, any>, mexp: number = -1) {
    const setValue = _.mapValues(value, (o) =>
      isNumber(o) || isString(o) ? o : JSON.stringify(o),
    );

    setValue._cache = 'true';

    await this.client.hset(key, setValue);

    if (mexp > 0) {
      await this.client.expire(key, Math.floor(mexp / 1000));
    }
  }

  async hGetParse(key: string): Promise<Record<string, any>> {
    const value = await this.client.hgetall(key);

    return _.mapValues(value, (o) => {
      try {
        return JSON.parse(o);
      } catch {
        return o;
      }
    });
  }

  // ================= LOCK =================

  async setnx(key: string, value: string, exp: number = -1) {
    const result = await this.client.set(key, value, 'NX');

    if (result && exp > 0) {
      await this.client.expire(key, exp);
      return true;
    }

    return false;
  }

  // ================= PATTERN =================

  async delByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({
      match: pattern,
      count: 100,
    });

    for await (const keys of stream) {
      if (keys.length) {
        await this.client.del(keys);
      }
    }
  }

  async getByPattern(pattern: string): Promise<any[]> {
    const result: any[] = [];

    const stream = this.client.scanStream({
      match: pattern,
      count: 100,
    });

    for await (const keys of stream) {
      for (const key of keys) {
        result.push({
          key,
          value: await this.getParse(key),
        });
      }
    }

    return result;
  }
}
