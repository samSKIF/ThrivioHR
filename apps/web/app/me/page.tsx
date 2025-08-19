'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:5000/graphql',
  cache: new InMemoryCache(),
});

const QUERY = gql`
  query Me {
    currentUser {
      id
      email
      displayName
    }
  }
`;

function MeView() {
  const { data, loading, error } = useQuery(QUERY);
  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error: {String(error)}</div>;
  const u = data?.currentUser;
  return (
    <div style={{ padding: 24 }}>
      <h1>Current User</h1>
      <pre>{JSON.stringify(u, null, 2)}</pre>
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