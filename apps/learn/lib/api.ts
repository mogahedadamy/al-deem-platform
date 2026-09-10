// عميل API للـlearn — يستخدم access token من الجلسة (server-side فقط).
import type { Session } from "next-auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// استدعاء API موثوق من server components فقط
export async function apiGet<T>(
  session: Session | null,
  path: string,
): Promise<T | null> {
  if (!session) return null;
  const token = (session as { accessToken?: string }).accessToken;
  if (!token) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  session: Session | null,
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!session) return { ok: false, status: 401, data: null, error: "unauthenticated" };
  const token = (session as { accessToken?: string }).accessToken;
  if (!token) return { ok: false, status: 401, data: null, error: "no access token" };
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return {
    ok: res.ok,
    status: res.status,
    data: res.ok ? data : null,
    error: data ? (data as { message?: string }).message : undefined,
  };
}

// ===== types (عقد OpenAPI) =====

export type MyEnrollment = {
  id: string;
  courseId: string;
  status: "pending_payment" | "active" | "completed" | "cancelled";
  priceAmount: number;
  currency: string;
  progressPct: number;
  startedAt: string | null;
  createdAt: string;
};

export type MyPayment = {
  id: string;
  enrollmentId: string;
  amount: number;
  currency: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  receiptUrl: string;
  bankReference: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type Me = {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
};

export type PublicCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: string;
  priceAmount: number;
  currency: string;
  durationHours: number;
  hasLiveSessions: boolean;
};

export type PublicOutline = {
  sections: {
    id: string;
    title: string;
    lessons: { id: string; title: string; type: string; isFreePreview: boolean }[];
  }[];
};
