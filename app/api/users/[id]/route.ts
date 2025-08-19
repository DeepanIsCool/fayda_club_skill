import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";
dotenv.config();

export async function GET(req: NextRequest) {
  try {
    const cookieValue = req.cookies.get("externalApiResponse")?.value;
    console.log("Cookie:", cookieValue);

    if (!cookieValue) {
      return NextResponse.json(
        { message: "Cookie not found" },
        { status: 400 }
      );
    }
    const parsed = JSON.parse(cookieValue);
    const id = parsed?.user?.id;

    if (!id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Make request to external API
    const response = await fetch(`${process.env.BASE_URL}/arcade/users/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Get user API error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
