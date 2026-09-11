import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) return NextResponse.json({ message: "سجّل الدخول" }, { status: 401 });
  const response = await fetch(`${API_BASE}/finance/receipts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ message: response.status === 404 ? "الإيصال غير موجود" : "تعذر فتح الإيصال" }, { status: response.status });
  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "inline; filename=receipt",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
