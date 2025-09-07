'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ExtensionSafeWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  isolate?: boolean; // Isolate from extension interference
}

export default function ExtensionSafeWrapper({ 
  children, 
  fallback = null, 
  isolate = true 
}: ExtensionSafeWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const [extensionDetected, setExtensionDetected] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Detect common browser extensions that cause hydration issues
    const checkForExtensions = () => {
      // Check for MyUS shopping extension
      const myusElements = document.querySelectorAll('[class*="myus-"], [id*="myus-"]');
      
      // Check for other common extension patterns
      const extensionPatterns = [
        '[class*="extension-"]',
        '[id*="extension-"]',
        '[class*="chrome-extension"]',
        '[data-extension]'
      ];
      
      const hasExtensions = myusElements.length > 0 || 
        extensionPatterns.some(pattern => document.querySelectorAll(pattern).length > 0);
      
      if (hasExtensions) {
        setExtensionDetected(true);
      }
    };

    // Check immediately and after a short delay
    checkForExtensions();
    const timer = setTimeout(checkForExtensions, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Don't render until we're on the client
  if (!isClient) {
    return fallback;
  }

  // If isolate is true and extensions detected, add protective wrapper
  if (isolate && extensionDetected) {
    return (
      <div style={{ isolation: 'isolate', position: 'relative' }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}