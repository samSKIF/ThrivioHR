import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:5000/health');
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: 'BFF server not available' }, { status: 503 });
  }
}