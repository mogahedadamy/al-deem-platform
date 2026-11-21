// حماية مسارات منصة التعلم — Next 16 proxy convention (بدلاً من middleware).
// غير المصادق عليه يُحوَّل إلى /login مع حفظ الوجهة المطلوبة.
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { handlers } from "./auth";

// المسارات المحمية — كل شيء عدا العامة
const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth", "/brand"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const sessionUrl = new URL("/api/auth/session", request.url);
  const sessionResult = await handlers.GET(new NextRequest(sessionUrl, { headers: request.headers }));
  const session = sessionResult.ok ? await sessionResult.json() : null;
  let response: NextResponse;
  if (session?.user) {
    // The downstream server component must see the rotated JWT on this request.
    const sessionCookies = new NextResponse(null, { headers: sessionResult.headers }).cookies;
    for (const cookie of sessionCookies.getAll()) {
      if (cookie.value) request.cookies.set(cookie.name, cookie.value);
      else request.cookies.delete(cookie.name);
    }
    response = NextResponse.next({ request: { headers: request.headers } });
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.json({ error: "unauthorized" }, { status: 401 });
  } else {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    response = NextResponse.redirect(loginUrl);
  }
  for (const cookie of sessionResult.headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

export const config = {
  // استبعاد ملفات Next الثابتة
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
