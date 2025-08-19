import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    
    // Forward the GraphQL request to the BFF server
    const response = await fetch('http://localhost:5000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GraphQL proxy error:', error);
    return NextResponse.json(
      { errors: [{ message: 'Internal server error' }] },
      { status: 500 }
    );
  }
}

export async function GET() {
  // GraphQL playground support (optional)
  return new NextResponse('GraphQL endpoint - use POST method', { status: 200 });
}