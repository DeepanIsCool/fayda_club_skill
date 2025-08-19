import { NextRequest, NextResponse } from 'next/server';
// Removed dotenv import and config; not supported in Edge Runtime

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

    // Extract user ID and wallet/score data
    const { id, wallet, score } = body;
    const updateData: { wallet?: number; score?: number } = {};
    
    if (typeof wallet === 'number') updateData.wallet = wallet;
    if (typeof score === 'number') updateData.score = score;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No valid wallet or score data to update' },
        { status: 400 }
      );
    }

    // Make request to external API
    const response = await fetch(`${process.env.BASE_URL}/arcade/users/${id}`, {
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
    console.error('Update wallet/score API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
