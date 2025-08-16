// The page MUST be a Client Component for React hooks to work:
'use client';
import { useState } from 'react';
const env = {
  BFF_BASE_URL: process.env.NEXT_PUBLIC_BFF_BASE_URL || 'http://localhost:5000',
};

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
      
      <div style={{ marginTop: 24, borderTop: '1px solid #ccc', paddingTop: 24 }}>
        <h3>SSO Integration</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>
          OIDC SSO foundation implemented. Configure OIDC environment variables to enable.
        </p>
        <button
          disabled
          style={{
            padding: '12px 24px',
            backgroundColor: '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          Sign in with SSO (Configure OIDC)
        </button>
      </div>
      
      <p>{msg}</p>
    </main>
  );
}