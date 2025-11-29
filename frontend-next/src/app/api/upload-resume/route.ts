import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SERVER_API_URL;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Validate required fields
    const file = formData.get('file') as File | null;
    const user_id = formData.get('user_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a file.' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Get folder_path if provided
    const folder_path = formData.get('folder_path') as string | null;

    // Forward the form data to backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    backendFormData.append('user_id', user_id);
    if (folder_path) {
      backendFormData.append('folder_path', folder_path);
    }

    const response = await fetch(`${BACKEND_URL}/api/upload-resume/`, {
      method: 'POST',
      body: backendFormData,
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
    console.error('Error uploading resume to backend:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload resume to backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

