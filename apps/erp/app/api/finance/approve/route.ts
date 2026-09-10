// Proxy للموظف المالي: اعتماد دفعة (الرمز يبقى server-side).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "سجّل الدخول" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.paymentId) {
    return NextResponse.json({ error: "VALIDATION", message: "paymentId مطلوب" }, { status: 400 });
  }
  const res = await fetch(
    `${API_BASE}/finance/payments/${encodeURIComponent(body.paymentId)}/approve`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  return new NextResponse(null, { status: res.status });
}
