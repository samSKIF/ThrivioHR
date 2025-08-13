import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ThrivioHR',
  description: 'AI-first Employee Engagement Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}