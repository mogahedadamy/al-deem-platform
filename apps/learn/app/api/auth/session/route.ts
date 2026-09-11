import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json(null);
  const safeSession = { ...session } as typeof session & { accessToken?: string };
  delete safeSession.accessToken;
  return NextResponse.json(safeSession, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
