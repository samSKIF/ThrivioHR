"use client";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  organizationId?: string;
  organization_id?: string;
  orgId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
};

export default function DirectoryUsersPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrgId() {
    const res = await fetch("/api/bff/auth/me", { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`auth/me ${res.status}`);
    const me = await res.json();
    return me.organizationId || me.organization_id || me.orgId || null;
  }

  async function fetchPage(id: string, cursor?: string | null) {
    const params = new URLSearchParams({ orgId: id, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/bff/directory/users?${params.toString()}`, { credentials: "include" });
    if (!res.ok) throw new Error(`directory/users ${res.status}`);
    return res.json();
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const id = await loadOrgId();
        if (!id) throw new Error("No organizationId found on current user.");
        setOrgId(id);
        const page = await fetchPage(id, null);
        setRows(Array.isArray(page?.users) ? page.users : []);
        setNextCursor(page?.nextCursor ?? null);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load directory.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadMore() {
    if (!orgId || !nextCursor) return;
    setLoading(true);
    try {
      const page = await fetchPage(orgId, nextCursor);
      setRows(prev => [...prev, ...(Array.isArray(page?.users) ? page.users : [])]);
      setNextCursor(page?.nextCursor ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load more.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Employee directory</h1>

      {loading && rows.length === 0 && <p>Loading…</p>}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 mb-4">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Organization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                const org = u.organizationId || u.organization_id || u.orgId || "—";
                return (
                  <tr key={u.id}>
                    <td>{name}</td>
                    <td>{u.email}</td>
                    <td>{org}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={loadMore}
          disabled={!nextCursor || loading}
          className="btn btn-primary"
        >
          {nextCursor ? (loading ? "Loading…" : "Load more") : "No more"}
        </button>
      </div>
    </main>
  );
}