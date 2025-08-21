export const dynamic = "force-dynamic";

const BFF_BASE =
  process.env.BFF_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BFF_URL ||
  "http://127.0.0.1:5000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = `${BFF_BASE}/oidc/callback${url.search}`;
  
  const headers = new Headers(request.headers);
  headers.set("host", new URL(BFF_BASE).host);

  const res = await fetch(target, {
    method: "GET",
    headers,
    redirect: "manual"
  });

  const responseHeaders = new Headers(res.headers);
  
  // Rewrite location header for redirects
  const location = responseHeaders.get("location");
  if (location) {
    const origin = new URL(request.url).origin;
    
    // Check for Replit preview domain in request headers
    const host = request.headers.get("host");
    const referer = request.headers.get("referer");
    if (host && (host.includes("replit.dev") || host.includes("repl.co"))) {
      const finalOrigin = `https://${host}`;
      responseHeaders.set("location", `${finalOrigin}/me`);
    } else if (referer && (referer.includes("replit.dev") || referer.includes("repl.co"))) {
      const finalOrigin = new URL(referer).origin;
      responseHeaders.set("location", `${finalOrigin}/me`);
    } else {
      // Fallback to request origin
      responseHeaders.set("location", `${origin}/me`);
    }
  }

  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    headers: responseHeaders
  });
}