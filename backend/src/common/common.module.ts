import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { AuthMiddleware } from './auth.middleware';
import { HttpExceptionFilter } from './http-exception-filter';
import { GenerateCsvService } from './generateCsv.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [PrismaService, HttpExceptionFilter, GenerateCsvService],
  exports: [PrismaService, HttpExceptionFilter, GenerateCsvService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: '/api/user/login', method: RequestMethod.POST },
        { path: '/api/user/refresh-token', method: RequestMethod.POST },
        { path: '/api/organization/landing-page', method: RequestMethod.GET },
        { path: '/api/agent/pair', method: RequestMethod.POST },
        { path: '/api/agent/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
