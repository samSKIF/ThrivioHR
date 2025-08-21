import Header from "../components/Header";
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <Header />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Welcome to ThrivioHR</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Sign in, then visit <code>/me</code> to see your profile (from <code>/auth/me</code>).
        </p>
        <a href="/api/bff/oidc/authorize" className="inline-block rounded px-4 py-2 bg-black text-white">
          Sign in with SSO
        </a>
      </section>
    </main>
  );
}