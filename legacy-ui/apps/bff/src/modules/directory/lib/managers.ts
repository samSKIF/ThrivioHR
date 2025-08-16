import { NormalizedRow, ManagerDiag } from './types';

export type ResolveManagerFn = (email: string) => Promise<'db' | 'csv' | null>;

export function buildEmailMap(rows: NormalizedRow[]): Map<string, NormalizedRow> {
  const m = new Map<string, NormalizedRow>();
  for (const r of rows) {
    const e = (r.email ?? '').trim().toLowerCase();
    if (e) m.set(e, r);
  }
  return m;
}

export async function diagnoseManagers(
  rows: NormalizedRow[],
  resolveManager: ResolveManagerFn
): Promise<ManagerDiag> {
  const perRecordIssues = new Map<string, string[]>();
  const edges: Array<[string, string]> = [];
  
  for (const r of rows) {
    const e = (r.email ?? '').trim().toLowerCase();
    const m = (r.managerEmail ?? '').trim().toLowerCase();
    if (!e) continue;
    if (m) edges.push([e, m]);
    perRecordIssues.set(e, []);
    if (m && e === m) perRecordIssues.get(e)!.push('self-manager');
  }

  // cycle detection
  const nodes = new Set<string>();
  edges.forEach(([a, b]) => { nodes.add(a); nodes.add(b); });
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n, []));
  edges.forEach(([a, b]) => adj.get(a)!.push(b));
  
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  nodes.forEach(n => color.set(n, WHITE));
  
  let cycles = 0, self = 0;
  function dfs(u: string) {
    color.set(u, GRAY);
    for (const v of adj.get(u) || []) {
      if (u === v) { self++; cycles++; continue; }
      const c = color.get(v);
      if (c === GRAY) { cycles++; }
      else if (c === WHITE) { dfs(v); }
    }
    color.set(u, BLACK);
  }
  nodes.forEach(n => { if (color.get(n) === WHITE) dfs(n); });

  // missing managers via resolver
  let missing = 0;
  for (const [email, issues] of perRecordIssues.entries()) {
    const row = rows.find(r => (r.email ?? '').trim().toLowerCase() === email)!;
    const m = (row.managerEmail ?? '').trim().toLowerCase();
    if (!m) continue;
    const res = await resolveManager(m);
    if (res === null) { issues.push('manager-not-found'); missing++; }
    else if (res === 'csv') { issues.push('manager-in-batch'); }
  }

  return { managerMissing: missing, managerSelf: self, managerCycles: cycles, perRecordIssues };
}