import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { HttpExceptionFilter } from './common/http-exception-filter';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { MyOrganizationModule } from './my-organization/my-organization.module';
import { RedisIoAdapterModule } from './RedisIoAdapter/redis-io-adapter.module';
import { InvoTrackModule } from './invo-track/invo-track.module';

@Module({
  imports: [
    CommonModule,
    UserModule,
    RedisModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),
    MyOrganizationModule,
    RedisIoAdapterModule,
    InvoTrackModule,
  ],
  controllers: [],
  providers: [HttpExceptionFilter],
})
export class AppModule {}
