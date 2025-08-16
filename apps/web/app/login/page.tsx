"use client";
import { useEffect, useState } from "react";
import { env } from "../../src/lib/env";

export default function LoginPage() {
  const [bffUp, setBffUp] = useState<boolean>(true); // default to true so the button is not greyed
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('csvdemo@example.com');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${env.BFF_BASE_URL}/health`, { method: "GET" });
        if (alive) setBffUp(res.ok);
      } catch {
        if (alive) setBffUp(false);
      }
    })();
    return () => { alive = false; };
  }, []);

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
        setMsg('Logged in. Go to /me.');
      } else {
        setMsg(json?.message || 'Login failed');
      }
    } catch (err) {
      setMsg('Network error: ' + err);
    }
  }

  const startSso = () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${env.BFF_BASE_URL}/sso/oidc/start?returnTo=${encodeURIComponent(origin)}`;
      window.location.href = url;
    } catch (err) {
      // Optionally show a toast/snackbar instead of alert
      alert("Unable to start SSO. Please try again or contact your admin.");
    }
  };

  return (
    <main suppressHydrationWarning style={{ padding: 24 }}>
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
      
      <div className="mt-4 flex items-center gap-2" style={{ marginTop: 24, borderTop: '1px solid #ccc', paddingTop: 24 }}>
        <button
          onClick={startSso}
          disabled={!bffUp}
          className={`rounded-md px-4 py-2 border ${bffUp ? "opacity-100 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
          aria-disabled={!bffUp}
          style={{
            padding: '12px 24px',
            backgroundColor: bffUp ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: bffUp ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            opacity: bffUp ? 1 : 0.5
          }}
        >
          Sign in with SSO
        </button>
        {!bffUp && (
          <span className="text-sm text-red-500" style={{ fontSize: '14px', color: '#dc3545' }}>
            SSO unavailable: backend is unreachable.
          </span>
        )}
      </div>
      
      <p>{msg}</p>
    </main>
  );
}