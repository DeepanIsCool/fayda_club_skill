import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Extract user ID and other fields
    const { id, ...updateData } = body;

    // Make request to external API
    const response = await fetch(`https://ai.rajatkhandelwal.com/arcade/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    // Return the response from external API
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
