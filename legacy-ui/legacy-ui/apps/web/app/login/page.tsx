'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('csvdemo@example.com');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('Logging in…');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgId, email }),
    });
    const json = await res.json();
    if (json?.accessToken) {
      localStorage.setItem('accessToken', json.accessToken);
      setMsg('Logged in. Go to /me.');
    } else {
      setMsg('Login failed');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label>Org ID</label>
          <input value={orgId} onChange={e => setOrgId(e.target.value)} placeholder="paste orgId" />
        </div>
        <div>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <button type="submit">Login</button>
      </form>
      <p>{msg}</p>
    </main>
  );
}