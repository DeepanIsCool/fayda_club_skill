import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { uuid: string } }) {
  const { uuid } = params;

  if (!uuid) {
    return NextResponse.json({ error: "Missing uuid" }, { status: 400 });
  }

  try {
    const clerkRes = await fetch(`${process.env.CLERK_ENDPOINT}/users/${uuid}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!clerkRes.ok) {
      const text = await clerkRes.text();
      return NextResponse.json({ error: text }, { status: clerkRes.status });
    }

    const userData = await clerkRes.json();
    return NextResponse.json({ user: userData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
