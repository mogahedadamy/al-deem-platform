// Proxy — إسناد/إزالة دور (system_admin).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

async function proxy(
  req: Request,
  method: "POST" | "DELETE",
  body: { userId: string; roleKey: string },
) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  const url = `${API_BASE}/admin/users/${encodeURIComponent(body.userId)}/roles${
    method === "DELETE" ? `?roleKey=${encodeURIComponent(body.roleKey)}` : ""
  }`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ roleKey: body.roleKey }) } : {}),
    cache: "no-store",
  });
  return new NextResponse(null, { status: res.status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !body?.roleKey) {
    return NextResponse.json(
      { error: "VALIDATION", message: "userId وroleKey مطلوبان" },
      { status: 400 },
    );
  }
  return proxy(req, "POST", { userId: body.userId, roleKey: body.roleKey });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !body?.roleKey) {
    return NextResponse.json(
      { error: "VALIDATION", message: "userId وroleKey مطلوبان" },
      { status: 400 },
    );
  }
  return proxy(req, "DELETE", { userId: body.userId, roleKey: body.roleKey });
}
