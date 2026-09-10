// @al-deem/ui — RTL design system v0 (R0 foundation)
// مبني على نفس الهوية البصرية للمشروع القديم (خط Cairo + الألوان الذهبية/الداكنة).

export type ColorToken = string;

export const colors = {
  primary: "#D4AF37",      // ذهبي — هوية المركز
  primaryDark: "#B8962E",
  secondary: "#1C2A3A",     // كحلي داكن
  background: "#F8F9FB",
  surface: "#FFFFFF",
  text: "#1A202C",
  textMuted: "#64748B",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  border: "#E2E8F0",
} as const;

export const typography = {
  fontFamily: '"Cairo", "Segoe UI", system-ui, sans-serif',
  weights: { regular: 400, medium: 600, bold: 700, black: 900 },
} as const;

export const radii = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const;

/** الأدوار المتوافقة مع Keycloak realm و roles table (R0). */
export const ROLE_LABELS_AR = {
  student: "طالب",
  instructor: "مدرب",
  content_reviewer: "مشرف محتوى",
  finance_officer: "موظف مالي",
  support_agent: "دعم فني",
  erp_staff: "موظف إداري",
  erp_manager: "مدير إداري",
  system_admin: "مدير نظام",
} as const;

export type RoleKey = keyof typeof ROLE_LABELS_AR;
