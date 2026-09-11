"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/site-content";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div id="mobile-navigation" className="mobile-menu-panel">
          <nav aria-label="قائمة الهاتف">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="mobile-nav-link" onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <a href="https://learn.alameedtraining.com" className="button button-primary mt-4 w-full">
            الدخول إلى منصة التعلم
          </a>
          <Link href="/verify" className="button button-secondary mt-2 w-full">
            التحقق من شهادة
          </Link>
        </div>
      )}
    </div>
  );
}
