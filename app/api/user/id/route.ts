import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
  if (!user || !user.id || !user.token) {
    return NextResponse.json(
      { success: false, error: "User data incomplete in cookie" },
      { status: 400 }
    );
  }

  try {
    const apiRes = await fetch(`${process.env.BASE_URL}/users/${user.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (err) {
    console.error("Error fetching user from API:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user from API" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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
  if (!user || !user.id || !user.token) {
    return NextResponse.json(
      { success: false, error: "User data incomplete in cookie" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { wallet, score } = body;

  try {
    const apiRes = await fetch(`${process.env.BASE_URL}/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ wallet, score }),
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (err) {
    console.error("Error updating user in API:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update user in API" },
      { status: 500 }
    );
  }
}
