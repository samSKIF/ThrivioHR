'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';

interface DynamicNoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Create a client-only wrapper that prevents hydration mismatches
const DynamicClientOnly = dynamic(
  () => Promise.resolve(({ children }: { children: ReactNode }) => <>{children}</>),
  {
    ssr: false,
    loading: () => null, // No loading spinner to prevent layout shift
  }
);

export default function DynamicNoSSR({ children, fallback = null }: DynamicNoSSRProps) {
  return (
    <DynamicClientOnly>
      {children}
    </DynamicClientOnly>
  );
}