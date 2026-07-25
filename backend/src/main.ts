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
  const prod = process.env.FRONTEND_URL;
  const origins: string[] = [];
  if (prod) {
    origins.push(
      ...prod
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } else {
    origins.push(
      ...dev
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
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

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
