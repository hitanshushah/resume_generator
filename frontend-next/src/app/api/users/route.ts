import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SERVER_API_URL;

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching users from backend:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch users from backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

