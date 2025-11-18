import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SERVER_API_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.username || !body.email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/users/check-or-create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: body.username,
        email: body.email,
        name: body.name || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `Backend error: ${response.status}` 
      }));
      
      return NextResponse.json(
        { error: errorData.error || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in check-or-create user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check or create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

