'use client';
import React, { useState, useEffect } from 'react';

export default function FirstPasswordPage() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [policy, setPolicy] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch('/api/bff/auth/password/policy').then(r=>r.json()).then(setPolicy).catch(()=>{});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) { setError('Passwords do not match'); return; }
    const r = await fetch('/api/bff/auth/password/first-set', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ passwordNew: pw })
    });
    if (!r.ok) {
      const j = await r.json().catch(()=>({error:'error'}));
      setError(j?.error === 'weak_password' ? `Weak password: ${(j.reasons||[]).join(', ')}` : 'Error updating password');
      return;
    }
    setOk(true);
    setTimeout(()=>{ window.location.href='/me'; }, 700);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Set your new password</h1>
      {policy && (
        <p className="text-sm text-gray-600 mb-2">
          Policy: min {policy.minLength}, upper/lower/digit/symbol required.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="New password" className="w-full border rounded px-3 py-2" required />
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Confirm password" className="w-full border rounded px-3 py-2" required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {ok && <p className="text-green-600 text-sm">Password updated. Redirecting…</p>}
        <button className="w-full rounded bg-blue-600 text-white py-2">Save</button>
      </form>
    </main>
  );
}