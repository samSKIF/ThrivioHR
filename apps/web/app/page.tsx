'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to login page on app startup
    router.push('/login');
  }, [router]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>ThrivioHR Web</h1>
      <p>Redirecting to login...</p>
      
      <div style={{ marginTop: 32 }}>
        <h2>Navigation</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: 16 }}>
            <a 
              href="/login" 
              style={{ 
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#0070f3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}
            >
              🔐 Login
            </a>
            <span style={{ marginLeft: 12, color: '#666' }}>
              Sign in to your account
            </span>
          </li>
          <li style={{ marginBottom: 16 }}>
            <a 
              href="/me" 
              style={{ 
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#666',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px'
              }}
            >
              👤 Profile (GraphQL)
            </a>
            <span style={{ marginLeft: 12, color: '#666' }}>
              View your profile data
            </span>
          </li>
          <li style={{ marginBottom: 16 }}>
            <a 
              href="/dev/auth" 
              style={{ 
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#f0ad4e',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px'
              }}
            >
              🔧 Dev Auth Bootstrap
            </a>
            <span style={{ marginLeft: 12, color: '#666' }}>
              Development authentication helper
            </span>
          </li>
        </ul>
      </div>
      
      <div style={{ marginTop: 32, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
        <h3>Big 3a: Web App Foundation - Complete ✅</h3>
        <ul style={{ marginLeft: 20 }}>
          <li>Next.js 14 with App Router</li>
          <li>Apollo Client GraphQL integration</li>
          <li>Authentication flow (REST → JWT → GraphQL)</li>
          <li>API proxying via Next.js rewrites</li>
          <li>Hydration mismatch fixes</li>
        </ul>
      </div>
    </main>
  );
}