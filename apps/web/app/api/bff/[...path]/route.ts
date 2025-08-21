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
      const l = new URL(loc, BFF_BASE);
      // If BFF redirects to itself (port 5000), proxy it through our API
      if (
        l.href.startsWith("http://127.0.0.1:5000") ||
        l.href.startsWith("http://localhost:5000") ||
        l.href.startsWith(BFF_BASE)
      ) {
        const origin = new URL(req.url).origin;
        headers.set("location", `${origin}/api/bff${l.pathname}${l.search}`);
      }
      // Also handle web app redirects
      else if (
        l.href.startsWith("http://127.0.0.1:3000") ||
        l.href.startsWith("http://localhost:3000")
      ) {
        const origin = new URL(req.url).origin;
        headers.set("location", `${origin}${l.pathname}${l.search}`);
      }
    } catch {
      /* ignore malformed Location */
    }
  }

  // NOTE: Set-Cookie headers are preserved automatically by Next Response when copied from fetch's response
  // Return raw body to preserve binary/redirect semantics.
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };