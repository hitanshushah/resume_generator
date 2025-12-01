import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SERVER_API_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, resume_id, new_filename } = body;

    if (!user_id || !resume_id || !new_filename) {
      return NextResponse.json(
        { error: 'user_id, resume_id, and new_filename are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/rename-file/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        resume_id,
        new_filename,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.error || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error renaming file in backend:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rename file in backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

