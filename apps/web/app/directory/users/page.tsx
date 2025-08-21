"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  organizationId: string;
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

  async function fetchMe() {
    const res = await fetch("/api/bff/auth/me", { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`auth/me ${res.status}`);
    const me = await res.json();
    return me?.organizationId || me?.organization_id || me?.orgId || null;
  }

  async function fetchPage(cursor?: string | null) {
    const params = new URLSearchParams();
    if (!orgId) return;
    params.set("orgId", orgId);
    params.set("limit", "20");
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/bff/directory/users?${params.toString()}`, { credentials: "include" });
    if (!res.ok) throw new Error(`directory/users ${res.status}`);
    return res.json();
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const id = await fetchMe();
        if (!id) throw new Error("No orgId found on current user.");
        setOrgId(id);
        const page = await fetchPage.call({orgId: id});
        // quick cast due to call binding: re-run properly
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        const res = await fetchPage(null);
        setRows(res?.users ?? []);
        setNextCursor(res?.nextCursor ?? null);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load directory.");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  async function loadMore() {
    if (!orgId || !nextCursor) return;
    try {
      setLoading(true);
      const res = await fetchPage(nextCursor);
      setRows(prev => [...prev, ...(res?.users ?? [])]);
      setNextCursor(res?.nextCursor ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load more.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Directory — Users</h1>
      {loading && rows.length === 0 && <p>Loading…</p>}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 mb-4">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
      {!loading && rows.length === 0 && !error && <p>No users found.</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafafa] border-b">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Organization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={u.id} className="border-b">
                    <td className="p-2">{name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.organizationId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={loadMore}
          disabled={!nextCursor || loading}
          className="rounded px-3 py-1.5 bg-black text-white disabled:opacity-50"
        >
          {nextCursor ? (loading ? "Loading…" : "Load more") : "No more"}
        </button>
      </div>
    </main>
  );
}