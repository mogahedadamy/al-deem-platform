"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type ErpNavItem = { href: string; label: string };

function MenuIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function NavIcon({ href }: { href: string }) {
  const paths: Record<string, string> = {
    "/": "M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z",
    "/review": "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4",
    "/finance": "M4 7h16v12H4zM4 10h16M8 15h3",
    "/papers": "M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 17h5",
    "/reports": "M5 20V10h3v10zm6 0V4h3v16zm6 0v-7h3v7z",
    "/users": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5M3 20v-2a5 5 0 0 1 10 0v2m1-6a4 4 0 0 1 7 3v3",
    "/audit": "M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6zM9 12l2 2 4-5",
    "/leads": "M4 5h16v12H8l-4 3zm4 4h8m-8 4h5",
  };
  return <svg viewBox="0 0 24 24" className="erp-nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={paths[href] ?? paths["/"]} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeCollapsedNavigation(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("erp-navigation-change", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("erp-navigation-change", notify);
  };
}

function getCollapsedNavigation() {
  try {
    return window.localStorage.getItem("erp-navigation-collapsed") === "true";
  } catch {
    return false;
  }
}

function NavigationLinks({ items, onNavigate, collapsed = false }: { items: readonly ErpNavItem[]; onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  return items.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <Link key={item.href} href={item.href} onClick={onNavigate} className="erp-nav-link" aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined}>
        <NavIcon href={item.href} />
        <span className="erp-nav-label">{item.label}</span>
      </Link>
    );
  });
}

export function ErpDesktopNavigation({ items }: { items: readonly ErpNavItem[] }) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsedNavigation,
    getCollapsedNavigation,
    () => false,
  );

  function toggle() {
    try {
      window.localStorage.setItem("erp-navigation-collapsed", String(!collapsed));
    } catch {
      return;
    }
    window.dispatchEvent(new Event("erp-navigation-change"));
  }

  return (
    <aside id="erp-desktop-navigation" className="erp-sidebar" data-collapsed={collapsed} aria-label="التنقل الإداري">
      <nav className="erp-sidebar-nav" aria-label="مساحات العمل المتاحة حسب صلاحياتك">
        <NavigationLinks items={items} collapsed={collapsed} />
      </nav>
      <button type="button" onClick={toggle} className="erp-sidebar-toggle" aria-expanded={!collapsed} aria-controls="erp-desktop-navigation" aria-label={collapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}>
        <CollapseIcon collapsed={collapsed} />
        <span className="erp-nav-label">طي القائمة</span>
      </button>
    </aside>
  );
}

export function ErpMobileNavigation({ items, accountHref }: { items: readonly ErpNavItem[]; accountHref: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function closeMenu({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="app-button app-button-primary h-11 w-11 p-0" aria-label="فتح القائمة الإدارية" aria-expanded={open} aria-controls="erp-mobile-navigation">
        <MenuIcon />
      </button>
      {open && (
        <div className="erp-mobile-layer">
          <button type="button" className="erp-mobile-backdrop" aria-label="إغلاق القائمة الإدارية" onClick={() => closeMenu()} />
          <aside ref={panelRef} id="erp-mobile-navigation" className="erp-mobile-panel" role="dialog" aria-modal="true" aria-labelledby="erp-mobile-title">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <strong id="erp-mobile-title" className="text-sm text-secondary">مساحات العمل</strong>
              <button ref={closeRef} type="button" onClick={() => closeMenu()} className="app-button app-button-outline h-11 w-11 p-0" aria-label="إغلاق القائمة"><CloseIcon /></button>
            </div>
            <nav className="mt-3 grid gap-1" aria-label="مساحات العمل المتاحة حسب صلاحياتك">
              <NavigationLinks items={items} onNavigate={() => closeMenu({ restoreFocus: false })} />
            </nav>
            <div className="mt-3 border-t border-border pt-3">
              <a href={accountHref} onClick={() => closeMenu({ restoreFocus: false })} className="erp-nav-link">
                <span className="erp-nav-icon grid place-items-center text-base" aria-hidden="true">⚙</span>
                <span className="erp-nav-label">الحساب وكلمة المرور</span>
              </a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
