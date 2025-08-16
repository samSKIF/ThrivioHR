import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const base = process.env.BFF_BASE_URL_INTERNAL || "http://localhost:5000";
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") || "";
  const target = `${base}/sso/oidc/start?returnTo=${encodeURIComponent(returnTo)}`;
  const resp = await fetch(target, { redirect: "manual" });
  const loc = resp.headers.get("location") || "/login?error=sso";
  return NextResponse.redirect(loc, 302);
}