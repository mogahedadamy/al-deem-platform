// Auth.js v5 (beta) — Keycloak SSO لـlearn.
// Access token من Keycloak يُخزَّن في الجلسة — التطبيقات تمرره لـcore-api
// الذي يتحقق منه (JWKS) ويجلب الأدوار الحقيقية من DB (مصدر الحقيقة).
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,

  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID ?? "learn",
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET ?? "",
      issuer:
        process.env.AUTH_KEYCLOAK_ISSUER ??
        "http://localhost:8091/realms/al-deem",
      checks: ["pkce", "state", "nonce"],
    }),
  ],

  callbacks: {
    // تخزين access token — core-api يتحقق منه ويجلب الأدوار من DB
    jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub ?? undefined;
      }
      (session as { accessToken?: string }).accessToken =
        token.accessToken as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
