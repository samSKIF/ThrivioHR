import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  // Forward the login request to the BFF
  const res = await fetch(`${process.env.NEXT_PUBLIC_BFF_BASE_URL}/corporate/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ message: data?.message || "Login failed" }, { status: res.status });
  }
  // Set token as httpOnly cookie
  const response = NextResponse.json({ user: data.user });
  response.cookies.set("corporate_token", data.token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    // Optionally set secure: true when running under HTTPS
  });
  return response;
}