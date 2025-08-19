import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

export async function GET(request: NextRequest) {
  try {
    console.log('📡 Fetching games from external API...');
    
    // Make request to external API
    const response = await fetch(`${process.env.BASE_URL}/arcade/games`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 seconds
    }); 

    if (!response.ok) {
      console.error(`❌ External API error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.games?.length || 0} games from external API`);

    // Return the response from external API
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Games API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch games from external API',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
