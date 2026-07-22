import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  // 증거 파일(Base64 포함) 전송을 위해 페이로드 한도 20MB로 확장
  app.use(require('express').json({ limit: '20mb' }));
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`[공명 서버] http://localhost:${port}`);
}

bootstrap();
