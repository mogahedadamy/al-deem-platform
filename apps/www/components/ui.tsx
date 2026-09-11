import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`site-container ${className}`}>{children}</div>;
}

export function Eyebrow({ children, icon: Icon }: { children: ReactNode; icon?: ComponentType<{ className?: string }> }) {
  return (
    <div className="eyebrow">
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div className={`section-heading ${align === "start" ? "section-heading-start" : ""}`}>
      {eyebrow && <span className="section-kicker">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "light";
  className?: string;
  external?: boolean;
}) {
  const classes = `button button-${variant} ${className}`;
  if (external) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-hero">
      <div className="page-hero-grid" aria-hidden="true" />
      <Container className="relative z-10">
        <span className="section-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </Container>
    </header>
  );
}
