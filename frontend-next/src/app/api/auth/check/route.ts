import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const BACKEND_URL = process.env.SERVER_API_URL;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  return 'unknown';
}

async function generateJWT(ip: string): Promise<string> {
  const jwt = await new SignJWT({ ip })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
  
  return jwt;
}

async function getOrCreateToken(ip: string, jwt: string): Promise<{ generation_count: number; jwt: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/token-management/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: jwt,
        ip_address: ip,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return {
      generation_count: data.generation_count || 0,
      jwt: data.token || jwt,
    };
  } catch (error) {
    console.error('Error managing token:', error);
    return {
      generation_count: 0,
      jwt: jwt,
    };
  }
}

async function getExistingToken(ip: string): Promise<{ generation_count: number; jwt: string } | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/token-management/get/?ip_address=${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.token) {
      return {
        generation_count: data.generation_count || 0,
        jwt: data.token,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching existing token:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get("host") || "";
    const subdomain = host.split(".")[0];
    const isDemoSubdomain = subdomain === "demo";
    let username: string | null;
    let email: string | null;
    let name: string | null;
    let demoCount: number | null = null;
    let jwtToken: string | null = null;

    if (isDemoSubdomain) {
      username = "demo";
      email = "demo@resumegenerator.live";
      name = "Demo User";
      
      const ip = getClientIP(request);
      
      const existingToken = await getExistingToken(ip);
      
      if (existingToken) {
        demoCount = existingToken.generation_count;
        jwtToken = existingToken.jwt;
      } else {
        const newJWT = await generateJWT(ip);
        
        const tokenData = await getOrCreateToken(ip, newJWT);
        demoCount = tokenData.generation_count;
        jwtToken = tokenData.jwt;
      }
    } else {
      username = request.headers.get("x-username");
      email = request.headers.get("x-email");
      name = request.headers.get("x-name");
    }

    if (!username || !email) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const response: any = {
      authenticated: true,
      user: {
        username: username.trim(),
        email: email.trim(),
        name: name ? name.trim() : null,
      },
    };

    if (isDemoSubdomain && demoCount !== null && jwtToken) {
      response.demo_count = demoCount;
      response.jwt = jwtToken;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
}

