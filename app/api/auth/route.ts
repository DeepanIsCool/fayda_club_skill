import { NextRequest, NextResponse } from "next/server";
import { request } from "https";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }
    const jwt = authHeader.replace("Bearer ", "");
    const base64Payload = jwt.split(".")[1];
    const payload = JSON.parse(
      Buffer.from(base64Payload, "base64").toString("utf-8")
    );
    const uuid = payload.sub || payload.uuid || "unknown";

    const response = await fetch(`${process.env.BASE_URL}/arcade/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: jwt }),
    });

    const data = await response.json();

    const res = NextResponse.json(
      {
        message: "JWT sent to external API",
        externalApiResponse: data,
      },
      { status: response.status }
    );

    res.cookies.set("externalApiResponse", JSON.stringify(data), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Error in Clerk auth route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
