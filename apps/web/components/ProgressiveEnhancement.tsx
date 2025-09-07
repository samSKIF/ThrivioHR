'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ProgressiveEnhancementProps {
  children: ReactNode;
  skeleton: ReactNode; // Static skeleton that matches server render
  delay?: number; // Delay before showing enhanced content
}

export default function ProgressiveEnhancement({ 
  children, 
  skeleton, 
  delay = 0 
}: ProgressiveEnhancementProps) {
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEnhanced(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // Show skeleton until enhanced version is ready
  if (!enhanced) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}