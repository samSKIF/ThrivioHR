// Extract counters aggregation to keep service small.
export type Counters = {
  creates: number; 
  updates: number; 
  skips: number;
  duplicates: number; 
  invalid: number;
};

export function summarize(records: Array<{ action: string; duplicate?: boolean; invalid?: boolean }>): Counters {
  let creates = 0, updates = 0, skips = 0, duplicates = 0, invalid = 0;
  for (const r of records) {
    if (r.invalid) { invalid++; continue; }
    if (r.duplicate) { duplicates++; }
    if (r.action === 'create') creates++;
    else if (r.action === 'update') updates++;
    else if (r.action === 'skip') skips++;
  }
  return { creates, updates, skips, duplicates, invalid };
}