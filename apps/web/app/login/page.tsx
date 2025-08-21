export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="w-full max-w-md border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-3">Sign in</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Use your organization email or continue with SSO.
        </p>

        <form method="POST" action="/api/bff/auth/login" className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Organization ID</label>
            <input
              name="organizationId"
              placeholder="org_123"
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@company.com"
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>

        <div className="my-4 flex items-center">
          <div className="flex-1 border-t border-neutral-200" />
          <span className="px-3 text-xs text-neutral-500">OR</span>
          <div className="flex-1 border-t border-neutral-200" />
        </div>

        <a
          href="/api/bff/oidc/authorize"
          className="w-full border border-neutral-300 text-neutral-700 py-2 rounded text-sm font-medium hover:bg-neutral-50 flex items-center justify-center"
        >
          Continue with SSO
        </a>
      </div>
    </main>
  );
}