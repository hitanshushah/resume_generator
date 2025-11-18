import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const username = request.headers.get("x-username");
    const email = request.headers.get("x-email");
    const name = request.headers.get("x-name");

    if (!username || !email) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: username.trim(),
        email: email.trim(),
        name: name ? name.trim() : null,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
}

