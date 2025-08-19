'use client';
import { gql, useQuery } from '@apollo/client';

const ME = gql`query { currentUser { id email displayName } }`;

export default function MePage() {
  const { data, loading, error } = useQuery(ME, { fetchPolicy: 'no-cache' });

  return (
    <main style={{ padding: 24 }}>
      <h1>Me</h1>
      {loading && <p>Loading…</p>}
      {error && (
        <>
          <p>Error: {error.message}</p>
          <p>(Tip: log in at /login)</p>
        </>
      )}
      {data?.currentUser && (
        <pre>{JSON.stringify(data.currentUser, null, 2)}</pre>
      )}
    </main>
  );
}