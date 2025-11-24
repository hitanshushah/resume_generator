import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.SERVER_API_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, job_description, user_id } = body;

    if (!prompt || !job_description || !user_id) {
      return new Response(
        JSON.stringify({ error: 'prompt, job_description, and user_id are required', type: 'error' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/generate-resume/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        job_description,
        user_id,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(
        JSON.stringify({ error: `Backend error: ${backendResponse.status}`, details: errorText, type: 'error' }),
        { 
          status: backendResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    
    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error calling generate-resume backend:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to call generate-resume backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

