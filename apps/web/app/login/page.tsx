'use client';
import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const r = await fetch('/api/bff/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (!r.ok) { setError('Invalid credentials'); return; }
    const data = await r.json();
    window.location.href = data?.passwordResetRequired ? '/password/new' : '/me';
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="Email" className="w-full border rounded px-3 py-2" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required placeholder="Password" className="w-full border rounded px-3 py-2" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full rounded bg-blue-600 text-white py-2">{loading ? 'Signing in…' : 'Login'}</button>
      </form>
      <div className="mt-6 text-center text-sm text-gray-500">or</div>
      <div className="mt-3">
        <a href="/api/bff/oidc/authorize" className="w-full inline-flex justify-center rounded border py-2">Login with SSO</a>
      </div>
    </main>
  );
}