# Keycloak Arabic theme and student self-registration

## What is configured

The `al-deem` realm uses the `alameed` login and email themes, Arabic as the default locale, and English as an optional locale. The login theme inherits Keycloak's maintained `keycloak.v2` templates, so the same polished RTL layout and Arabic messages are applied to login, registration, forgot-password, reset-password, email-verification, error, and required-action screens without copying version-sensitive FreeMarker templates.

The realm permits public self-registration. A new account:

1. uses its email address as its immutable username;
2. must verify that email address;
3. is added to the `/students` default group; and
4. receives only the low-privilege `student` realm role through that group.

The registration UI never exposes role selection. Instructor, finance, ERP, support, reviewer, and administrator roles remain assignable only by an administrator. The ERP Users page sends staff invitations through the confidential `core-api` service account; the production configuration script grants that account only Keycloak `manage-users`, never `realm-admin`.

## Keycloak limitation and staff procedure

Keycloak directly supports a **default group for every newly created user**, but it does not distinguish a self-registered user from an Admin Console-created user when applying default groups. Consequently, an administrator-created staff account also initially joins `/students`.

Before assigning any staff role, remove that staff user from `/students` in **Users → _user_ → Groups**. This avoids mixed student/staff authorization semantics. Never add a privileged role to the `/students` group.

This limitation is fail-safe for privilege escalation: it can give staff an unwanted low-privilege role, but self-registered users cannot obtain a staff role.

## Initial and existing realms

For a fresh database, Docker's `--import-realm` imports all settings from:

- `infra/docker/keycloak/realms/al-deem-realm.json`

Realm import does not overwrite an already existing realm. For an existing production realm, run the idempotent configuration script after deploying the mounted theme:

```bash
export KC_ADMIN_USER='...'
export KC_ADMIN_PASSWORD='...'
export KC_ENABLE_STUDENT_SELF_REGISTRATION=true
# Enable only after production SMTP is configured and tested:
export KC_ENABLE_EMAIL_VERIFICATION=true
infra/prod/scripts/configure-keycloak.sh
```

To close registration safely while preserving existing users:

```bash
KC_ENABLE_STUDENT_SELF_REGISTRATION=false infra/prod/scripts/configure-keycloak.sh
```

That disables the registration endpoint and removes `/students` from the realm's default groups; it does not alter existing users.

## Deployment notes

- `infra/docker/compose.yaml` mounts `infra/docker/keycloak/themes` read-only at `/opt/keycloak/themes`.
- Restart the existing Keycloak container after changing theme files: `docker compose -f infra/docker/compose.yaml restart keycloak`.
- Production must configure a real SMTP provider before enforcing email verification/reset. Mailpit is development-only.
- Keep `verifyEmail=true`, brute-force protection enabled, and TLS termination correctly configured for public registration.
- If open student enrollment is not intended, set `KC_ENABLE_STUDENT_SELF_REGISTRATION=false` and provision students through an approved enrollment workflow instead.
