// app/api/fetchclerkuser/[uuid]/route.ts
import { NextRequest, NextResponse } from "next/server";

// Use `any` for the route context to match Next's expected handler signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, { params }: any) {
  const { uuid } = params ?? {};

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
  } catch (err: unknown) {
    let message = 'Unknown error';
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'string') {
      message = err;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
