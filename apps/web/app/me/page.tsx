'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useEffect, useState } from 'react';

const httpLink = createHttpLink({
  uri: '/api/graphql', // Use Next.js proxy route instead of direct localhost
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only', // Always fetch fresh data
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

const QUERY = gql`
  query Me {
    currentUser {
      id
      email
      firstName
      lastName
      displayName
    }
  }
`;

function MeView() {
  const { data, loading, error } = useQuery(QUERY);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    setToken(storedToken);
  }, []);

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div>Loading…</div>
      <pre data-testid="me-json">{JSON.stringify({ loading: true }, null, 2)}</pre>
    </div>
  );
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Authentication Required</h1>
        <p>Error: {error.message}</p>
        {!token && (
          <div>
            <p>No authentication token found. Please <a href="/login">login first</a>.</p>
          </div>
        )}
        {token && (
          <div>
            <p>Token exists but may be invalid. Try <a href="/login">logging in again</a>.</p>
          </div>
        )}
        <pre data-testid="me-json">{JSON.stringify({ error: error.message, hasToken: !!token }, null, 2)}</pre>
      </div>
    );
  }
  
  const u = data?.currentUser;
  
  // Always show data-testid for testing, even with no user
  return (
    <div style={{ padding: 24 }}>
      <h1>Current User Profile</h1>
      {u ? (
        <div>
          <p><strong>ID:</strong> {u.id}</p>
          <p><strong>Email:</strong> {u.email}</p>
          <p><strong>First Name:</strong> {u.firstName || 'Not set'}</p>
          <p><strong>Last Name:</strong> {u.lastName || 'Not set'}</p>
          <p><strong>Display Name:</strong> {u.displayName || 'Not set'}</p>
          <hr />
          <pre data-testid="me-json">{JSON.stringify(u, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <p>No user data available</p>
          <pre data-testid="me-json">{JSON.stringify({ error: "No user data" }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ApolloProvider client={client}>
      <MeView />
    </ApolloProvider>
  );
}