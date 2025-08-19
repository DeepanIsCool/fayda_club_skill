import { NextRequest, NextResponse } from 'next/server';
// Removed dotenv import and config; not supported in Edge Runtime

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.BASE_URL}/arcade/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
