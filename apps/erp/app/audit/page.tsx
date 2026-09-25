import Link from "next/link";
import { auth } from "@/auth";

export const metadata = { title: "سجل التدقيق" };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";
type Item = { id: string; actorName: string; action: string; resourceType: string; resourceId?: string | null; createdAt: string };

const actionLabel: Record<string, string> = {
  "staff.invited": "دعوة موظف", "role.assigned": "إسناد دور", "role.removed": "إزالة دور", "profile.updated": "تحديث ملف", "course.published": "نشر دورة", "course.rejected": "رفض دورة", "payment.approved": "اعتماد دفعة", "payment.rejected": "رفض دفعة",
};

export default async function AuditPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const response = token ? await fetch(`${API_BASE}/admin/audit-logs?pageSize=50`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null) : null;
  const data = response?.ok ? await response.json() as { items: Item[]; total: number } : null;
  return <div className="flex flex-1 flex-col"><header className="border-b border-border bg-surface"><div className="app-container py-8"><nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل"><Link href="/" className="hover:text-primary">الرئيسية</Link><span className="mx-2">/</span><span className="font-medium text-secondary">سجل التدقيق</span></nav><p className="app-kicker">الأمان والحوكمة</p><h1 className="app-title">سجل العمليات الحساسة</h1><p className="app-description">مراجعة أحدث تغييرات الأدوار والدعوات والمحتوى والمدفوعات. هذه المساحة متاحة لمدير النظام فقط.</p></div></header><main className="app-page flex-1">{!data ? <div className="app-alert border-amber-200 bg-amber-50 text-amber-900"><p className="font-black">تعذر تحميل سجل التدقيق</p><p className="mt-2 text-sm">تأكد من صلاحيات الحساب أو حاول لاحقاً.</p></div> : data.items.length === 0 ? <div className="app-empty"><p className="font-black text-secondary">لا عمليات مسجلة بعد</p></div> : <div className="app-table-wrap"><table><thead><tr><th>الوقت</th><th>المنفذ</th><th>العملية</th><th>المورد</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td className="whitespace-nowrap text-xs text-muted">{new Date(item.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</td><td className="font-bold text-secondary">{item.actorName || "النظام"}</td><td>{actionLabel[item.action] ?? item.action}</td><td className="text-xs text-muted">{item.resourceType}{item.resourceId ? ` · ${item.resourceId}` : ""}</td></tr>)}</tbody></table></div>}</main></div>;
}
