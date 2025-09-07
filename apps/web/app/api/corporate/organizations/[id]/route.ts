import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Update organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("corporate_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  
  const { id } = await params;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BFF_BASE_URL}/corporate/organizations/${id}`,
    {
      method: 'PUT',
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