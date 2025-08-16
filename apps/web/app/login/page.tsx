// The page MUST be a Client Component for React hooks to work:
'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('csvdemo@example.com');
  const [msg, setMsg] = useState('');

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
      <p>{msg}</p>
    </main>
  );
}