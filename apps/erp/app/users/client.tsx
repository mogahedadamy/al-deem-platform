"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OperationError } from "../operation-feedback";

type Role = { key: string; label: string };
type PendingChange = { roleKey: string; add: boolean };

export function RoleActions({ userId, current, roles }: { userId: string; current: string[]; roles: Role[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  async function toggle(roleKey: string, add: boolean) {
    if (!window.confirm(`${add ? "إسناد" : "إزالة"} هذا الدور للمستخدم؟`)) return;
    setBusy(roleKey);
    setError(null);
    setPendingChange({ roleKey, add });
    try {
      const response = await fetch("/api/roles", {
        method: add ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleKey }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? "تعذر تحديث الدور.");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((role) => {
          const has = current.includes(role.key);
          return (
            <button key={role.key} type="button" onClick={() => void toggle(role.key, !has)} disabled={busy !== null} aria-pressed={has} title={has ? "إزالة الدور" : "إسناد الدور"} className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${has ? "bg-secondary text-secondary-foreground hover:opacity-85" : "border border-border text-muted hover:border-primary hover:text-primary"}`}>
              {role.label}{has ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <OperationError message={error} busy={busy !== null} onRetry={() => pendingChange && void toggle(pendingChange.roleKey, pendingChange.add)} />
    </div>
  );
}
