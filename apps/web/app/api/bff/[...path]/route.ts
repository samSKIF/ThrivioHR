export const dynamic = "force-dynamic";

const BFF_BASE =
  process.env.BFF_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BFF_URL ||
  "http://127.0.0.1:5000"; // server-to-server default

function buildTarget(req: Request, path: string[]) {
  const url = new URL(req.url);
  const search = url.search || "";
  const cleanBase = BFF_BASE.replace(/\/+$/, "");
  const cleanPath = path.join("/");
  return `${cleanBase}/${cleanPath}${search}`;
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  const target = buildTarget(req, params.path || []);
  const incoming = new Headers(req.headers);
  // Ensure Host header matches BFF (helpful for some frameworks)
  try {
    incoming.set("host", new URL(BFF_BASE).host);
  } catch {}

  const init: RequestInit = {
    method: req.method,
    headers: incoming,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
    redirect: "manual", // we want to pass 3xx + Location through
  };

  const res = await fetch(target, init);
  const headers = new Headers(res.headers);

  // Rewrite Location header to proxy through our API when it points to BFF
  const loc = headers.get("location");
  if (loc) {
    try {
      // Get origin from request URL, but prefer Replit domain if available
      let origin = new URL(req.url).origin;
      
      // Check for Replit preview domain in request headers
      const host = req.headers.get("host");
      const referer = req.headers.get("referer");
      if (host && (host.includes("replit.dev") || host.includes("repl.co"))) {
        origin = `https://${host}`;
      } else if (referer && (referer.includes("replit.dev") || referer.includes("repl.co"))) {
        origin = new URL(referer).origin;
      }
      
      // Parse the location URL
      let l: URL;
      try {
        l = new URL(loc);
      } catch {
        l = new URL(loc, BFF_BASE);
      }
      
      // If BFF redirects to itself (port 5000), proxy it through our API
      if (
        l.href.startsWith("http://127.0.0.1:5000") ||
        l.href.startsWith("http://localhost:5000") ||
        l.href.startsWith(BFF_BASE)
      ) {
        headers.set("location", `${origin}/api/bff${l.pathname}${l.search}`);
      }
      // Always rewrite web app redirects to same origin (localhost or 127.0.0.1 on port 3000)
      else if (
        l.href.includes("127.0.0.1:3000") ||
        l.href.includes("localhost:3000")
      ) {
        headers.set("location", `${origin}${l.pathname}${l.search}`);
      }
    } catch (e) {
      console.warn("Failed to rewrite location header:", loc, e);
      /* ignore malformed Location */
    }
  }

  // Add debug logging for all proxy requests
  console.log(`[PROXY] ${req.method} ${req.url} -> ${target}`);
  if (res.status >= 400) {
    console.error(`[PROXY ERROR] Status ${res.status} for ${req.method} ${req.url}`);
  }

  // NOTE: Set-Cookie headers are preserved automatically by Next Response when copied from fetch's response
  // Return raw body to preserve binary/redirect semantics.
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };