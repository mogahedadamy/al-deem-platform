// إدارة المستخدمين والأدوار — system_admin فقط.
import { auth } from "@/auth";
import Link from "next/link";
import { RoleActions } from "./client";

export const metadata = { title: "المستخدمون" };

type User = {
  id: string;
  fullName: string;
  email: string;
  status: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

// التسمية العربية للأدوار (من packages/ui ROLE_LABELS_AR)
const ROLES: { key: string; label: string }[] = [
  { key: "student", label: "طالب" },
  { key: "instructor", label: "مدرب" },
  { key: "content_reviewer", label: "مراجع محتوى" },
  { key: "finance_officer", label: "موظف مالي" },
  { key: "support_agent", label: "دعم فني" },
  { key: "erp_staff", label: "موظف إداري" },
  { key: "erp_manager", label: "مدير إداري" },
  { key: "system_admin", label: "مدير النظام" },
];

async function fetchUsers(token: string, page: number) {
  const res = await fetch(`${API_BASE}/admin/users?page=${page}&pageSize=20`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ items: User[]; total: number }>;
}

async function fetchUserRoles(token: string, userId: string) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const d = (await res.json()) as { roles?: string[] };
  return d.roles ?? [];
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.max(1, Number.parseInt(requestedPage ?? "1", 10) || 1);
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
      </div>
    );
  }
  const data = await fetchUsers(token, page);
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">
          إدارة المستخدمين لمدير النظام فقط.
        </p>
      </div>
    );
  }

  // أدوار كل مستخدم (متوازٍ)
  const rolesByUser = new Map<string, string[]>();
  await Promise.all(
    data.items.map(async (u) => {
      rolesByUser.set(u.id, await fetchUserRoles(token, u.id));
    }),
  );
  const totalPages = Math.max(1, Math.ceil(data.total / 20));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">الرئيسية</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">المستخدمون</span>
          </nav>
          <p className="app-kicker">إدارة الوصول</p>
          <h1 className="app-title">المستخدمون ({data.total})</h1>
          <p className="app-description">إدارة أدوار الفريق — كل تغيير يُسجَّل في سجل التدقيق.</p>
        </div>
      </header>

      <div className="app-page flex-1">
        <div className="app-table-wrap">
          <table className="min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/[.03] text-right">
                <th className="px-4 py-3 font-semibold text-secondary">الاسم</th>
                <th className="px-4 py-3 font-semibold text-secondary">البريد</th>
                <th className="px-4 py-3 font-semibold text-secondary">الأدوار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((u) => (
                <tr key={u.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-secondary">{u.fullName || "—"}</td>
                  <td className="px-4 py-3 text-muted" dir="ltr">{u.email || "—"}</td>
                  <td className="px-4 py-3">
                    <RoleActions
                      userId={u.id}
                      current={rolesByUser.get(u.id) ?? []}
                      roles={ROLES}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="ترقيم المستخدمين">
          <span className="text-sm text-muted">الصفحة {page} من {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={`/users?page=${page - 1}`} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-secondary hover:border-primary">السابق</Link> : <span className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted opacity-50">السابق</span>}
            {page < totalPages ? <Link href={`/users?page=${page + 1}`} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-secondary hover:border-primary">التالي</Link> : <span className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted opacity-50">التالي</span>}
          </div>
        </nav>
      </div>
    </div>
  );
}
