'use client';
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider } from '@apollo/client';

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const client = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    fetch: (input, init) => {
      const headers = { ...(init?.headers || {}), ...authHeader() };
      return fetch(input, { ...init, headers });
    },
  }),
  cache: new InMemoryCache(),
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}