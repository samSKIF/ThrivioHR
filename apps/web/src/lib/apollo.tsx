'use client';
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider } from '@apollo/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

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
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </QueryClientProvider>
  );
}