// app/api/profile/route.ts
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type PublicMetadata = {
  phone?: string;
  address?: Address;
  [key: string]: unknown;
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: { phone?: string; address?: Address };
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const phone = (payload.phone || "").trim();
    const address = payload.address || {};

    if (!phone || !address.line1 || !address.city || !address.country) {
      return NextResponse.json(
        {
          error:
            "Missing phone, address.line1, address.city, or address.country",
        },
        { status: 400 }
      );
    }

    // Fetch current to merge safely
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const pm = ((user.publicMetadata ?? {}) as PublicMetadata) || {};

    const updatedPublicMetadata = {
      ...pm,
      phone,
      address: {
        ...(pm.address ?? {}),
        ...address,
      },
    };
    await clerk.users.updateUser(userId, {
      publicMetadata: updatedPublicMetadata,
    });

    return NextResponse.json({
      ok: true,
      publicMetadata: updatedPublicMetadata,
    });
  } catch (err: unknown) {
    // Log on server for debugging
    if (err instanceof Error) {
      console.error("POST /api/profile error:", err.message);
    } else {
      console.error("POST /api/profile error:", err);
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
