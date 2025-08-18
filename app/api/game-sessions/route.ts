import { NextRequest, NextResponse } from 'next/server';

interface GameSessionRequest {
  gameId: string;
  userId: string;
  level: number;
  score: number;
  duration: number;
  sessionData: Record<string, unknown>;
  achievements?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GameSessionRequest = await request.json();
    
    // Validate required fields
    if (!body.gameId || !body.userId) {
      return NextResponse.json(
        { success: false, message: 'Game ID and User ID are required' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (typeof body.level !== 'number' || typeof body.score !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Level and score must be numbers' },
        { status: 400 }
      );
    }

    // Prepare session data for external API according to the API spec
    const sessionPayload = {
      userId: body.userId,
      gameId: body.gameId,
      session: {
        // Core game data
        gameType: body.sessionData.gameType || "Unknown Game",
        finalLevel: body.level,
        totalScore: body.score,
        gameDuration: body.duration || 0,
        
        // Performance metrics
        averageAccuracy: body.sessionData.averageAccuracy || 0,
        perfectPlacements: body.sessionData.perfectPlacements || 0,
        maxConsecutiveStreak: body.sessionData.maxConsecutiveStreak || 0,
        averageReactionTime: body.sessionData.averageReactionTime || 0,
        
        // Detailed gameplay metrics
        totalPrecisionScore: body.sessionData.totalPrecisionScore || 0,
        totalOverlapPercentage: body.sessionData.totalOverlapPercentage || 0,
        consecutiveSuccessStreak: body.sessionData.consecutiveSuccessStreak || 0,
        
        // Block and area metrics
        totalTowerArea: body.sessionData.totalTowerArea || 0,
        totalAreaLost: body.sessionData.totalAreaLost || 0,
        minBlockArea: body.sessionData.minBlockArea || 0,
        maxBlockArea: body.sessionData.maxBlockArea || 0,
        initialBlockArea: body.sessionData.initialBlockArea || 0,
        
        // Timing data
        gameStartTime: body.sessionData.gameStartTime || 0,
        gameEndTime: body.sessionData.gameEndTime || 0,
        totalGameTime: body.sessionData.totalGameTime || 0,
        lastBlockTime: body.sessionData.lastBlockTime || 0,
        
        // Detailed arrays (for analysis)
        blockPlacementTimes: body.sessionData.blockPlacementTimes || [],
        blockAreas: body.sessionData.blockAreas || [],
        areaLossHistory: body.sessionData.areaLossHistory || [],
        
        // Achievements and rewards
        achievements: body.achievements || [],
        
        // Session metadata
        timestamp: body.sessionData.timestamp || new Date().toISOString(),
        platform: body.sessionData.platform || 'web',
        version: body.sessionData.version || '1.0.0',
        
        // Additional custom data
        ...body.sessionData,
      },
    };

    // Log the session locally (for debugging)
    console.log('📊 Game session completed:', {
      gameId: body.gameId,
      userId: body.userId,
      level: body.level,
      score: body.score,
      duration: body.duration,
    });

    // Send to external game session API
    const response = await fetch('https://ai.rajatkhandelwal.com/arcade/gamesession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionPayload),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('❌ Game session API error:', error);
    
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const gameId = searchParams.get('gameId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // TODO: Fetch user's game sessions from external API
    // For now, return mock data
    const mockSessions = [
      {
        id: `session_${Date.now()}_${userId}`,
        gameId: gameId || 'cmeeho5mc0002qv0i0s7p2h00',
        userId,
        level: 5,
        score: 250,
        duration: 120000,
        createdAt: new Date().toISOString(),
        sessionData: {
          perfectPlacements: 3,
          maxConsecutiveStreak: 4,
          averageReactionTime: 850,
        },
      },
    ];

    return NextResponse.json({
      success: true,
      sessions: gameId 
        ? mockSessions.filter(s => s.gameId === gameId)
        : mockSessions,
    });
    
  } catch (error) {
    console.error('❌ Error fetching game sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
