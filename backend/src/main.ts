import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/http-exception-filter';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/PrismaException';
import { RedisIoAdapter } from './RedisIoAdapter/redis-io-adapter.service';

function getCorsOrigins(): string[] {
  const dev =
    process.env.FRONTEND_URL_DEV ||
    'http://localhost:4321,http://127.0.0.1:4321';
  const prod = process.env.FRONTEND_URL_PROD;
  if (process.env.NODE_ENV === 'production' && prod) {
    return [prod];
  }
  const origins = dev
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  origins.push('http://localhost:4321', 'http://127.0.0.1:4321');
  return [...new Set(origins)];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  try {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  } catch {
    /* backend tetap jalan tanpa Redis adapter */
  }

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch(() => {
  process.exit(1);
});
