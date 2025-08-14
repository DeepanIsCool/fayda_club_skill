import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email || !body.password || !body.phone) {
      return NextResponse.json(
        { message: 'Name, email, password, and phone are required' },
        { status: 400 }
      );
    }

    // Make request to external API
    const response = await fetch('https://ai.rajatkhandelwal.com/arcade/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
        phone: body.phone,
      }),
    });

    const data = await response.json();

    // Return the response from external API
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Sign up API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
