// Proxy — طلب نسخة ورقية.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "سجّل الدخول" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => null);
  if (!body?.certificateId || !body?.deliveryAddress || !body?.deliveryPhone) {
    return NextResponse.json(
      {
        error: "VALIDATION",
        message: "certificateId والعنوان والهاتف مطلوبة",
      },
      { status: 400 },
    );
  }
  const res = await fetch(`${API_BASE}/me/paper-requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      certificateId: body.certificateId,
      deliveryAddress: body.deliveryAddress,
      deliveryPhone: body.deliveryPhone,
      notes: body.notes ?? "",
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? {}, { status: res.status });
}
