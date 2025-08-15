import type { Metadata } from 'next';
import { Providers } from '../src/lib/apollo';

export const metadata: Metadata = { title: 'ThrivioHR', description: 'Web App Foundation' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}