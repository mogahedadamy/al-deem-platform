// إسناد/إزالة الأدوار — عبر proxy routes (token server-side).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = { key: string; label: string };

export function RoleActions({
  userId,
  current,
  roles,
}: {
  userId: string;
  current: string[];
  roles: Role[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(roleKey: string, add: boolean) {
    if (!window.confirm(`${add ? "إسناد" : "إزالة"} هذا الدور للمستخدم؟`)) return;
    setBusy(roleKey);
    setError(null);
    const res = await fetch(
      add ? "/api/roles" : "/api/roles",
      {
        method: add ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleKey }),
      },
    );
    setBusy(null);
    if (res.ok) {
      router.refresh();
    } else {
      const b = await res.json().catch(() => null);
      setError(b?.message ?? "تعذر التحديث");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((role) => {
        const has = current.includes(role.key);
        return (
          <button
            key={role.key}
            onClick={() => toggle(role.key, !has)}
            disabled={busy === role.key}
            title={has ? "إزالة الدور" : "إسناد الدور"}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
              has
                ? "bg-secondary text-secondary-foreground hover:opacity-85"
                : "border border-border text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {role.label}
            {has ? " ✓" : ""}
          </button>
        );
      })}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
