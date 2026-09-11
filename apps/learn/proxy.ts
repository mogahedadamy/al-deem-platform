// حماية مسارات منصة التعلم — Next 16 proxy convention (بدلاً من middleware).
// غير المصادق عليه يُحوَّل إلى /login مع حفظ الوجهة المطلوبة.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// المسارات المحمية — كل شيء عدا العامة
const PUBLIC_PATHS = ["/", "/login", "/api/auth", "/brand"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // المسارات العامة تمر
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // وجود session cookie يشير إلى جلسة نشطة (تحقق فعلي يتم في server components)
  // HTTPS يستخدم __Secure- prefix (الإنتاج)، HTTP بدون prefix (dev)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");
  if (sessionCookie) {
    return NextResponse.next();
  }

  // غير مصادق → /login مع تذكر الوجهة
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("callbackUrl", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // استبعاد ملفات Next الثابتة
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
