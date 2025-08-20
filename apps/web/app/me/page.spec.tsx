import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Page from './page';

const mockPayload = {
  data: {
    currentUser: {
      id: '6f1a81cb-d20d-4c1a-b5a6-facd561e085e',
      email: 'csvdemo@example.com',
      displayName: 'CSV Demo',
      __typename: 'User',
    },
  },
};

beforeEach(() => {
  // Ensure page uses our test endpoint/token if it reads env at runtime
  (process as any).env.NEXT_PUBLIC_BFF_URL = 'http://test/graphql';
  (process as any).env.NEXT_PUBLIC_DEV_TOKEN = 'test-dev-token';

  // Mock fetch used by Apollo HttpLink
  // Node 20 provides global Response; fall back to a simple object if needed
  global.fetch = jest.fn(async () =>
    new Response(JSON.stringify(mockPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }) as any
  ) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders current user on /me and includes data-testid="me-json"', async () => {
  render(<Page />);

  // Title present
  await screen.findByText(/Current User/i);

  // JSON block with our payload
  const pre = await screen.findByTestId('me-json');
  expect(pre.textContent).toContain('csvdemo@example.com');
  expect(pre.textContent).toContain('CSV Demo');

  // Also ensure the ID from your screenshot-like data flows through
  expect(pre.textContent).toContain('6f1a81cb-d20d-4c1a-b5a6-facd561e085e');
});