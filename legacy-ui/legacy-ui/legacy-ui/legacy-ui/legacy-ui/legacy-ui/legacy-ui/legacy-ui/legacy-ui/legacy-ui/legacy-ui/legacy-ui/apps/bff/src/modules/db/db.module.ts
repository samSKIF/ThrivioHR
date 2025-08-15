import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../../services/identity/src/db/schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';

@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useValue: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    },
    {
      provide: DRIZZLE_DB,
      inject: ['PG_POOL'],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DbModule {}