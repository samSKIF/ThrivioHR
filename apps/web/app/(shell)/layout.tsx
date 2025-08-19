export default function ShellLayout({ children }: { children: React.ReactNode }) {
  // Dev-only role stub; replace with real auth after SSO
  const isAuthed = typeof window !== 'undefined' && localStorage.getItem('dev_token');
  if (!isAuthed && typeof window !== 'undefined' && location.pathname.startsWith('/admin')) {
    if (location.pathname !== '/login') location.href = '/login';
  }
  return <div>{children}</div>;
}