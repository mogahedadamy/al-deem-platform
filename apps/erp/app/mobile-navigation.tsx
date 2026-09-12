"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MobileNavItem = { href: string; label: string };

function MenuIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}

export function ErpMobileNavigation({ items, accountHref }: { items: readonly MobileNavItem[]; accountHref: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} className="app-button app-button-primary h-11 w-11 p-0" aria-label="فتح القائمة الإدارية" aria-expanded={open}>
        <MenuIcon />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-secondary/35 backdrop-blur-sm" role="presentation" onClick={() => setOpen(false)}>
          <nav className="absolute inset-x-3 top-3 rounded-[1.25rem] border border-border bg-surface p-3 shadow-2xl" aria-label="القائمة الإدارية" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <strong className="text-sm text-secondary">نظام العميد الإداري</strong>
              <button type="button" onClick={() => setOpen(false)} className="app-button app-button-outline h-10 w-10 p-0" aria-label="إغلاق القائمة">
                <CloseIcon />
              </button>
            </div>
            <div className="mt-2 grid gap-1">
              <a href={accountHref} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-secondary hover:bg-surface-soft">الحساب وكلمة المرور</a>
              {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-secondary hover:bg-surface-soft">{item.label}</Link>)}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
