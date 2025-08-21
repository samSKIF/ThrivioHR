"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";

type Me = {
  id?: string;
  email?: string;
  displayName?: string;
  [k: string]: any;
};

export default function MePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        // Call BFF with cookies
        const res = await fetch("http://127.0.0.1:5000/auth/me", {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json" },
        });
        if (!res.ok) {
          const text = await res.text();
          setError(`auth/me returned ${res.status}: ${text.slice(0,200)}`);
          setMe(null);
        } else {
          const data = await res.json();
          setMe(data);
          setError(null);
        }
      } catch (e: any) {
        setError(e?.message || "Unknown error");
        setMe(null);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      <Header />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        {loading && <p>Loading…</p>}
        {!loading && error && (
          <div className="rounded border border-red-300 bg-red-50 p-3">
            <div className="font-semibold mb-1">Not signed in</div>
            <div className="text-sm">{error}</div>
            <a href="http://127.0.0.1:5000/oidc/authorize" className="mt-3 inline-block rounded px-3 py-1.5 bg-black text-white">
              Sign in with SSO
            </a>
          </div>
        )}
        {!loading && !error && me && (
          <pre className="p-3 border border-[#eaeaea] rounded bg-[#fafafa] overflow-auto text-sm">
{JSON.stringify(me, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}