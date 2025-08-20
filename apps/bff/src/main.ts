import 'reflect-metadata';
import { config } from 'dotenv';
config({ path: '../../.env' });
import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

export async function createTestApp(): Promise<INestApplication> {
  const logger = process.env.NODE_ENV === 'test' ? ['error'] : ['log', 'error', 'warn'];
  const app = await NestFactory.create(AppModule, { logger: logger as ('log' | 'error' | 'warn')[] });
  // IMPORTANT: do NOT app.listen() in tests. Call app.init() in specs.
  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] });
  
  app.use((req, _res, next) => {
    if ((process.env.NODE_ENV || '') !== 'production' && process.env.DEV_COOKIE_AUTH_SHIM !== 'false') {
      const cookie = req.headers.cookie || '';
      const m = /(?:^|;)\s*sid=([^;]+)/.exec(cookie);
      if (m && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${m[1]}`;
      }
    }
    next();
  });
  
  const port = Number(process.env.PORT || 5000);

  // Skip binding when under Jest/test
  const isJest = typeof process.env.JEST_WORKER_ID !== 'undefined' || process.env.NODE_ENV === 'test';
  if (!isJest) {
    await app.listen(port);
    new Logger('Bootstrap').log(`BFF listening on http://localhost:${port}`);
  }
}

// If executed directly (node dist/apps/bff/main.js), start server
if (require.main === module) {
  bootstrap().catch((err) => {
     
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}