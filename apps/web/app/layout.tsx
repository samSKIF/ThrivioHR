import type { Metadata } from 'next';
import { Providers } from '../src/lib/apollo';
import './globals.css';

export const metadata: Metadata = { title: 'ThrivioHR', description: 'Web App Foundation' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}