import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger } from '@nestjs/common';

// DOTENV: do not override existing env; allow opt-out via DOTENV_DISABLE=true
(() => {
  try {
    if (process.env.DOTENV_DISABLE === 'true') {
      if ((process.env.NODE_ENV || '') !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[dotenv] disabled via DOTENV_DISABLE=true');
      }
      return;
    }
    const { config } = require('dotenv');
    const res = config({ path: '../../.env', override: false }); // <— key: NEVER override
    if ((process.env.NODE_ENV || '') !== 'production' && process.env.OIDC_DEBUG === 'true') {
      const count = res?.parsed ? Object.keys(res.parsed).length : 0;
      // eslint-disable-next-line no-console
      console.log(`[dotenv] loaded ${count} vars from ../../.env (override=false)`);
      // quick sanity: show the first 60 chars of AUTHZ endpoint
      const authz = process.env.OIDC_AUTHORIZATION_ENDPOINT || '';
      // eslint-disable-next-line no-console
      console.log(`[dotenv] OIDC_AUTHORIZATION_ENDPOINT=${authz.slice(0,60)}`);
    }
  } catch { /* ignore */ }
})();
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