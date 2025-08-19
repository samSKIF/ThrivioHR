"use client";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [bffUp, setBffUp] = useState(true); // optimistic by default
  const [orgId, setOrgId] = useState('9e2e7679-e33e-4cbe-9edc-195f13e9f909');
  const [email, setEmail] = useState('csvdemo@example.com');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setMounted(true); // avoid hydration mismatch from extensions injecting attributes
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    (async () => {
      try {
        const res = await fetch("/api/bff/health", { method: "GET", signal: controller.signal });
        if (alive) setBffUp(res.ok);
      } catch {
        if (alive) setBffUp(false);
      } finally {
        clearTimeout(t);
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [mounted]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('Logging in…');
    
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId, email }),
      });
      const json = await res.json();
      if (json?.accessToken) {
        localStorage.setItem('accessToken', json.accessToken);
        setMsg('Logged in. Redirecting to profile...');
        // Redirect to /me page after successful login
        window.location.href = '/me';
      } else {
        setMsg(json?.message || 'Login failed');
      }
    } catch (err) {
      setMsg('Network error: ' + err);
    }
  }

  const startSso = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // Use our same-origin proxy route so the browser never talks to localhost:5000
    window.location.href = `/api/sso/oidc/start?returnTo=${encodeURIComponent(origin)}`;
  };

  return (
    <main style={{ padding: 24 }} suppressHydrationWarning>
      <h1>Login</h1>

      <form onSubmit={onSubmit}>
        <div>
          <label>Org ID</label>
          <input
            suppressHydrationWarning
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="paste orgId"
          />
        </div>
        <div>
          <label>Email</label>
          <input
            suppressHydrationWarning
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button suppressHydrationWarning type="submit">Login</button>
      </form>

      {/* SSO block only renders after mount to avoid hydration diff */}
      {mounted && (
        <div className="mt-4 flex items-center gap-2" style={{ marginTop: 24 }}>
          <button
            onClick={startSso}
            disabled={!bffUp}
            className={`rounded-md px-4 py-2 border ${bffUp ? "opacity-100 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
            aria-disabled={!bffUp}
            style={{ padding: "12px 24px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: 6 }}
            suppressHydrationWarning
          >
            Sign in with SSO
          </button>
          {!bffUp && (
            <span className="text-sm" style={{ color: "#dc2626" }}>
              SSO temporarily unavailable (backend unreachable)
            </span>
          )}
        </div>
      )}

      <p>{msg}</p>
    </main>
  );
}