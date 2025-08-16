import { sql } from 'drizzle-orm';
import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../modules/db/db.module';

type DrizzleDatabase = NodePgDatabase<any>;

@Injectable()
export class OrgSqlContext {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase
  ) {}
  
  async runWithOrg<T>(orgId: string, fn: (db: DrizzleDatabase) => Promise<T>) {
    return this.db.transaction(async (tx: DrizzleDatabase) => {
      // Use sql.raw to avoid parameterization issues with SET LOCAL 
      await tx.execute(sql.raw(`SET LOCAL app.org_id = '${orgId.replace(/'/g, "''")}'`));
      return fn(tx);
    });
  }
}