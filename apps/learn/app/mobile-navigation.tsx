"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export type MobileNavItem = { href: string; label: string };

function MenuIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}

export function LearnMobileNavigation({ items, children }: { items: readonly MobileNavItem[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="md:hidden">
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="app-button app-button-primary h-11 w-11 p-0" aria-label="فتح القائمة" aria-expanded={open} aria-controls="learn-mobile-menu">
        <MenuIcon />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-secondary/35 backdrop-blur-sm" role="presentation" onClick={closeMenu}>
          <nav id="learn-mobile-menu" className="absolute inset-x-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[1.25rem] border border-border bg-surface p-3 shadow-2xl" aria-label="قائمة منصة التعلم" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <strong className="text-sm text-secondary">منصة التعلم</strong>
              <button ref={closeRef} type="button" onClick={closeMenu} className="app-button app-button-outline h-11 w-11 p-0" aria-label="إغلاق القائمة">
                <CloseIcon />
              </button>
            </div>
            <div className="mt-2 grid gap-1">
              {items.map((item) => item.href.startsWith("http") ? (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-secondary hover:bg-surface-soft">{item.label}</a>
              ) : (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-secondary hover:bg-surface-soft">{item.label}</Link>
              ))}
              {children}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
