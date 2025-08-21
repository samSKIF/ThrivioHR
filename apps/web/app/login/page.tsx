export default function LoginPage() {
  return (
    <main style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center" }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card card-pad">
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Sign in</h1>
          <p className="muted" style={{ marginBottom: 16 }}>Use your organization email or continue with SSO.</p>

          <form method="POST" action="/api/bff/auth/login" style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 14 }}>
              <div style={{ marginBottom: 6 }}>Organization ID</div>
              <input className="input" name="orgId" placeholder="org_123" required />
            </label>
            <label style={{ fontSize: 14 }}>
              <div style={{ marginBottom: 6 }}>Email</div>
              <input className="input" type="email" name="email" placeholder="you@company.com" required />
            </label>
            <button className="btn btn-primary" type="submit">Login</button>
          </form>

          <div className="muted" style={{ textAlign: "center", margin: "12px 0" }}>or</div>
          <a className="btn btn-primary" href="/api/bff/oidc/authorize">Sign in with SSO</a>

          <p className="muted" style={{ marginTop: 12 }}>After login you'll be redirected to <code>/me</code>.</p>
        </div>
      </div>
    </main>
  );
}