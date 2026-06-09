import { Module } from '@nestjs/common';
import { RedisIoAdapter } from './redis-io-adapter.service';

@Module({
  exports: [RedisIoAdapter],
  providers: [RedisIoAdapter],
})
export class RedisIoAdapterModule {}
