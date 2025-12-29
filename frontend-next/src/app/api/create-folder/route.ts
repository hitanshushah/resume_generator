import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SERVER_API_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, folder_name, parent_folder } = body;

    if (!user_id || !folder_name) {
      return NextResponse.json(
        { error: 'user_id and folder_name are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/create-folder/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        folder_name,
        parent_folder: parent_folder || '',
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
    console.error('Error creating folder in backend:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create folder in backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

