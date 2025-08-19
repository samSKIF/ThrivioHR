'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DevAuthContent() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    // Hard stop in production: do not set tokens in prod builds
    if (process.env.NODE_ENV === 'production') return;

    const token = sp.get('token');
    if (token) {
      try {
        localStorage.setItem('accessToken', token);
      } catch (e) {
        console.warn('Failed to set token:', e);
      }
    }
    router.replace('/me');
  }, [router, sp]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dev Auth Bootstrap</h1>
      <p>Setting token (dev only) and redirecting to /me…</p>
      {process.env.NODE_ENV === 'production' && (
        <p style={{ color: 'crimson' }}>
          Disabled in production builds.
        </p>
      )}
    </main>
  );
}

export default function DevAuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DevAuthContent />
    </Suspense>
  );
}