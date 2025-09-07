import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Create subscription for organization
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("corporate_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BFF_BASE_URL}/corporate/organizations/${params.id}/subscription`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(body),
    }
  );
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}