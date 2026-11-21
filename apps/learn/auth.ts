import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";
import type { JWT } from "next-auth/jwt";

const issuer = process.env.AUTH_ZITADEL_ISSUER ?? "http://localhost:8091";
const clientId = process.env.AUTH_ZITADEL_ID ?? "learn";
const clientSecret = process.env.AUTH_ZITADEL_SECRET ?? "";

type RefreshResult = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

async function refreshAccessToken(token: JWT): Promise<JWT | null> {
  if (typeof token.refreshToken !== "string") return null;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });
    if (clientSecret) body.set("client_secret", clientSecret);
    const response = await fetch(`${issuer}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`refresh failed: ${response.status}`);
    const refreshed = (await response.json()) as RefreshResult;
    if (typeof refreshed.access_token !== "string" || !refreshed.access_token ||
        !Number.isFinite(refreshed.expires_in) || refreshed.expires_in <= 0) return null;
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Zitadel({
      clientId,
      clientSecret,
      issuer,
      checks: ["pkce", "state", "nonce"],
      authorization: { params: { scope: "openid email profile offline_access" } },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true;
    },
    async jwt({ token, account }) {
      if (!account && token.authError) return null;
      if (account && !account.access_token) return null;
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = (account.expires_at ?? 0) * 1000;
        token.providerSubject = account.providerAccountId;
        return token;
      }
      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires - 30_000
      ) {
        return token;
      }
      return refreshAccessToken(token);
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.providerSubject as string | undefined;
      }
      (session as { accessToken?: string }).accessToken =
        token.accessToken as string | undefined;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
