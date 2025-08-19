'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestAuthPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Call REST login endpoint
      const loginRes = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status}`);
      }

      const { access_token } = await loginRes.json();
      
      // Store token (use same key as login page)
      localStorage.setItem('accessToken', access_token);
      setSuccess('Login successful! Token stored.');
      
      // Redirect to /me page after successful login
      setTimeout(() => {
        router.push('/me');
      }, 1500);
      
      // Test GraphQL with token
      const graphqlRes = await fetch('http://localhost:5000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          query: `query { currentUser { id email firstName lastName displayName } }`
        })
      });

      const graphqlData = await graphqlRes.json();
      
      if (graphqlData.errors) {
        setError(`GraphQL Error: ${JSON.stringify(graphqlData.errors)}`);
      } else {
        setSuccess(prev => prev + '\n\nGraphQL Success! User: ' + JSON.stringify(graphqlData.data.currentUser, null, 2));
      }
      
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCurrent = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No token found. Please login first.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('http://localhost:5000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `query { currentUser { id email firstName lastName displayName } }`
        })
      });

      const data = await res.json();
      
      if (data.errors) {
        setError(`GraphQL Error: ${JSON.stringify(data.errors)}`);
      } else {
        setSuccess('Current User: ' + JSON.stringify(data.data.currentUser, null, 2));
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>Authentication Test Page</h1>
      
      <div style={{ marginBottom: 20 }}>
        <h2>1. Login</h2>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 8, marginRight: 8, width: 200 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 8, marginRight: 8, width: 200 }}
          />
          <button onClick={handleLogin} disabled={loading} style={{ padding: 8 }}>
            Login & Test
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>2. Test Current User</h2>
        <button onClick={handleTestCurrent} disabled={loading} style={{ padding: 8 }}>
          Test currentUser Query
        </button>
        <button 
          onClick={() => router.push('/me')} 
          style={{ padding: 8, marginLeft: 8 }}
        >
          Go to /me Page
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ color: 'red', whiteSpace: 'pre-wrap', marginTop: 20 }}>
          <strong>Error:</strong><br />
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ color: 'green', whiteSpace: 'pre-wrap', marginTop: 20 }}>
          <strong>Success:</strong><br />
          {success}
        </div>
      )}

      <div style={{ marginTop: 40, padding: 20, backgroundColor: '#f5f5f5' }}>
        <h3>Token Status</h3>
        <p>Token in localStorage: {typeof window !== 'undefined' && localStorage.getItem('token') ? 'Yes' : 'No'}</p>
        <button onClick={() => {
          localStorage.removeItem('token');
          setSuccess('Token cleared');
          setError('');
        }}>
          Clear Token
        </button>
      </div>
    </div>
  );
}