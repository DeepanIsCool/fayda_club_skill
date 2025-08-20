import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("externalApiResponse");
  if (!cookie) {
    return NextResponse.json(
      { success: false, error: "Missing user cookie" },
      { status: 401 }
    );
  }

  let token;
  try {
    token = JSON.parse(cookie.value)?.user?.token;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Invalid cookie format" },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Auth token not found in cookie" },
      { status: 400 }
    );
  }

  try {
    const apiRes = await fetch(`${process.env.BASE_URL}/games`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (err) {
    console.error("Error fetching all games from API:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch all games from API" },
      { status: 500 }
    );
  }
}
