import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Reset admin password for organization
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("corporate_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BFF_BASE_URL}/corporate/organizations/${params.id}/reset-admin-password`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
    }
  );
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}