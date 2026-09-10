# Al Deem Training Platform — منصة الديم للتدريب v2

> Monorepo للمنصة الجديدة — 3 واجهات (www + learn + erp) + Go core-api
> القرارات المعتمدة: `docs/plans/APPROVED_DECISIONS.md` (أصلًا في مجلد العمل الرئيسي)

## البنية

```text
platform/
├── apps/
│   ├── www/          → www.alameedtraining.com    — واجهة المركز الرسمية (Next.js)
│   ├── learn/        → learn.alameedtraining.com  — منصة الكورسات: طالب + مدرب (Next.js)
│   └── erp/          → erp.alameedtraining.com   — النظام الإداري المتخصص (Next.js)
├── packages/
│   ├── ui/           → RTL design system مشترك
│   ├── api-client/   → OpenAPI generated TS client
│   └── config/       → eslint/tsconfig/tokens مشتركة
├── services/
│   └── core-api/     → Go Modular Monolith (cmd/api + cmd/worker + internal/*)
├── infra/
│   └── docker/       → compose.yaml للبيئة المحلية
└── docs/             → ERD، API contracts، ADRs
```

## المتطلبات
- Node ≥ 24 + pnpm
- Go ≥ 1.25 (`export PATH=$PATH:/home/mojahed/go/bin`)
- Docker (postgres/redis/keycloak/mailpit)

## البدء السريع (بيئة محلية)

```bash
# 1) تشغيل البنية المحلية
pnpm docker:up          # postgres:5435 + redis:6391 + keycloak:8091 + mailpit:8092

# 2) تبعيات الواجهات
pnpm install

# 3) migrations (جداول الهوية R0)
export DATABASE_URL="postgres://deem:deem@localhost:5435/deem?sslmode=disable"
pnpm db:migrate

# 4) تشغيل API (hot-reload)
pnpm api:dev            # يستمع على :4001

# 5) تشغيل الواجهات (شاشات منفصلة)
pnpm --filter www dev   # :3001
pnpm --filter learn dev # :3002
pnpm --filter erp dev   # :3003
```

## الخدمات المحلية (infra/docker/compose.yaml)

| الخدمة | Port المحلي | بيانات الدخول |
|---|---|---|
| PostgreSQL 17 | 5435 | user: deem / pass: deem / db: deem |
| Redis 7 | 6391 | — |
| Keycloak 26 | 8091 | console: deem-admin / deem-admin-password-change-me — realm: `al-deem` |
| Mailpit Web UI | 8092 (SMTP 8093) | — |
| core-api | 4001 | — |

> المنافذ 5435/6391/8091/8092 مختارة لتجنب التعارض مع خدمات السيرفر الموجودة (5432/5433/5434/6381/8081/8026 محجوزة).

## خريطة الإصدارات
R0 Foundation (هوية/أدوار/audit) → R1 Catalog & Authoring → R2 Enrollment & Learning → R3 Assessment & Live → R4 ERP & Launch
