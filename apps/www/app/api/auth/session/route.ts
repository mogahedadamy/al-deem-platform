import { handlers } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const result = await handlers.GET(request);
  if (!result.ok) return result;
  const session = await result.json();
  const response = NextResponse.json(
    session?.user ? { user: session.user, expires: session.expires } : null,
    { headers: { "Cache-Control": "private, no-store" } },
  );
  for (const cookie of result.headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
