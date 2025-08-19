import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const base = process.env.BFF_BASE_URL_INTERNAL || "http://localhost:5000";
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2000);
  try {
    const r = await fetch(`${base}/health`, { signal: controller.signal });
    clearTimeout(t);
    return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 503 });
  } catch {
    clearTimeout(t);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}