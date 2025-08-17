import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract id from the URL pathname
    const id = request.nextUrl.pathname.split('/').filter(Boolean).pop();

    if (!id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Make request to external API
    const response = await fetch(`https://ai.rajatkhandelwal.com/arcade/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Return the response from external API
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
