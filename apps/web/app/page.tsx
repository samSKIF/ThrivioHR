import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Build origin from incoming request (works on Replit and localhost)
  const h = await headers();
  const origin =
    `${h.get("x-forwarded-proto") || "http"}://${h.get("host") || "127.0.0.1:3000"}`;

  // Forward the incoming cookie to our same-origin API proxy
  const cookieHeader = (await cookies()).toString();

  try {
    const res = await fetch(`${origin}/api/bff/auth/me`, {
      headers: { cookie: cookieHeader, Accept: "application/json" },
      // we want a fresh view of auth each request
      cache: "no-store",
    });
    if (res.ok) {
      const me = await res.json();
      const isAuthed = !!(me?.email || me?.sub || me?.id);
      if (isAuthed) {
        // logged in → go to profile
        redirect("/me");
      }
    }
  } catch {
    // ignore network/parse errors; fall through to login page
  }

  // not logged in → redirect to login page
  redirect('/login');
}