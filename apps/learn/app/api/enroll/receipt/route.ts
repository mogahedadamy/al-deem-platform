import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) return NextResponse.json({ message: "سجّل الدخول" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const receipt = form?.get("receipt");
  if (!(receipt instanceof File)) return NextResponse.json({ message: "ملف الإيصال مطلوب" }, { status: 400 });
  if (receipt.size > 5 * 1024 * 1024) return NextResponse.json({ message: "حجم الإيصال يجب ألا يتجاوز 5MB" }, { status: 400 });
  const upstream = new FormData();
  upstream.set("receipt", receipt);
  const response = await fetch(`${API_BASE}/me/receipts`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: upstream, cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
