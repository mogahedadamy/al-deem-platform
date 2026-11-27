"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LEARN_URL } from "@/lib/portal-url";
import { NAV_ITEMS } from "@/lib/site-content";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    function dismiss(event: Event) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    const expanded = window.matchMedia("(min-width: 80rem)");
    function onResize() {
      if (expanded.matches) setOpen(false);
    }
    expanded.addEventListener("change", onResize);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      expanded.removeEventListener("change", onResize);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);

  return (
    <div ref={container} className="nav-disclosure">
      <button type="button" ref={button} className="mobile-menu-trigger" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        <span className="compact-trigger">{open ? <X size={21} /> : <Menu size={21} />}<span className="sr-only">{open ? "إغلاق القائمة" : "فتح القائمة"}</span></span>
        <span className="medium-trigger">المزيد <ChevronDown size={15} aria-hidden="true" /></span>
      </button>
      {open && (
        <div id="mobile-navigation" className="mobile-menu-panel">
          <nav aria-label="قائمة الهاتف">
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href} className={item.href === "/courses" || item.href === "/about" ? "compact-nav-item" : ""}>
                  <Link href={item.href} className="mobile-nav-link" onClick={() => setOpen(false)}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mobile-menu-actions" onClick={() => setOpen(false)}>
            <Link href="/login" className="mobile-nav-link compact-nav-item">تسجيل الدخول</Link>
            <a href={LEARN_URL} className="mobile-nav-link compact-nav-item">الدخول إلى منصة التعلم</a>
            <Link href="/verify" className="mobile-nav-link">التحقق من شهادة</Link>
          </div>
        </div>
      )}
    </div>
  );
}
