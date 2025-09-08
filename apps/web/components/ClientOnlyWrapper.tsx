'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientOnlyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ClientOnlyWrapper({ children, fallback }: ClientOnlyWrapperProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure DOM is stable and avoid hydration mismatches
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!hasMounted) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}