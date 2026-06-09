import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;
  private isConnected = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        // Retry dengan exponential backoff, maksimal 10 detik
        const delay = Math.min(times * 50, 10000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Handle connection events
    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
    });

    this.client.on('error', () => {
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    // Try to connect
    this.client.connect().catch(() => {
      this.isConnected = false;
    });
  }

  async set(key: string, value: string, ttlSeconds: number) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        return null; // Return null jika tidak terhubung, bukan throw error
      }
      return await this.client.get(key);
    } catch (error) {
      return null; // Return null jika error, bukan throw
    }
  }

  async del(key: string) {
    try {
      if (!this.isConnected) {
        return; // Skip jika tidak terhubung
      }
      await this.client.del(key);
    } catch (error) {
      // Don't throw
    }
  }
}
