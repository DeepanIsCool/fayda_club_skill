import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get("externalApiResponse");
  if (!cookie) {
    return NextResponse.json(
      { success: false, error: "Missing user cookie" },
      { status: 401 }
    );
  } 

  let cookieData;
  try {
    cookieData = JSON.parse(cookie.value);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Invalid cookie format" },
      { status: 400 }
    );
  }

  const user = cookieData.user;
  if (!user || !user.token) {
    return NextResponse.json(
      { success: false, error: "Auth token not found in cookie" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { gameId } = body;

  if (!gameId) {
    return NextResponse.json(
      { success: false, error: "Missing gameId in request body" },
      { status: 400 }
    );
  }

  try {
    const apiRes = await fetch(`${process.env.BASE_URL}/gamesession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ gameId }),
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (err) {
    console.error("Error starting game session:", err);
    return NextResponse.json(
      { success: false, error: "Failed to start game session" },
      { status: 500 }
    );
  }
}
