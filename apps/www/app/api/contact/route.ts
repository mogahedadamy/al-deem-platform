// استقبال استفسارات الموقع (leads — R4-B leads & inquiries).
// MVP: يسجّل في قاعدة بيانات المركز عبر core-api (أو تجاهل هادئًا إذا لم يُهيّأ).
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "VALIDATION", message: "طلب غير صالح" },
      { status: 400 },
    );
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "استفسار عام");
  const message = String(body.message ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "VALIDATION", message: "الاسم والبريد والرسالة مطلوبة" },
      { status: 400 },
    );
  }

  // التسجيل في core-api — وحدة leads (R4-B)
  try {
    const res = await fetch(`${API_BASE}/public/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: String(body.phone ?? ""),
        subject,
        message,
        source: "www/contact",
      }),
    });
    if (res.ok) {
      return NextResponse.json({ ok: true });
    }
    const d = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    return NextResponse.json(
      { error: "VALIDATION", message: d.message ?? "تعذر إرسال الاستفسار" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { error: "INTERNAL", message: "تعذر الإرسال — حاول لاحقًا" },
      { status: 500 },
    );
  }
}
