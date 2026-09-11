import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";

const issuer = process.env.AUTH_KEYCLOAK_ISSUER ?? "http://localhost:8091/realms/al-deem";
const clientId = process.env.AUTH_KEYCLOAK_ID ?? "learn";
const clientSecret = process.env.AUTH_KEYCLOAK_SECRET ?? "";

type RefreshResult = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (typeof token.refreshToken !== "string") return { ...token, authError: "RefreshTokenMissing" };
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });
    if (clientSecret) body.set("client_secret", clientSecret);
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`refresh failed: ${response.status}`);
    const refreshed = (await response.json()) as RefreshResult;
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      authError: undefined,
    };
  } catch {
    return { ...token, authError: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Keycloak({ clientId, clientSecret, issuer, checks: ["pkce", "state", "nonce"] }),
  ],
  callbacks: {
    async jwt({ token, account }) {
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
      (session as { accessToken?: string; authError?: string }).accessToken =
        token.accessToken as string | undefined;
      (session as { authError?: string }).authError = token.authError as string | undefined;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
