// Start the three local apps with AUTH_SECRET set to the same test-only secret.
// Run with node --test and set SESSION_TEST_SECRET to that secret.
import { encode } from "next-auth/jwt";
import assert from "node:assert/strict";
import test from "node:test";

const salt = "authjs.session-token";
const apps = [
  { name: "erp", port: process.env.ERP_TEST_PORT ?? 3003, path: "/reports" },
  { name: "learn", port: process.env.LEARN_TEST_PORT ?? 3002, path: "/dashboard" },
  { name: "www", port: process.env.WWW_TEST_PORT ?? 3001 },
];
for (const { name, port, path } of apps) {
  test(name + " validates sessions and keeps tokens private", async () => {
    const secret = process.env.SESSION_TEST_SECRET;
    assert.ok(secret, "Set SESSION_TEST_SECRET for the local test servers");
    const origin = "http://localhost:" + Number(port);
    for (const state of ["valid", "expired", "previous-error"]) {
      const token = {
        sub: "fixture",
        name: "Test User",
        providerSubject: "fixture",
        accessToken: "fixture-token",
        accessTokenExpires: Date.now() + (state === "expired" ? -60_000 : 600_000),
        authError: state === "previous-error" ? "RefreshAccessTokenError" : undefined,
      };
      const value = await encode({ secret, salt, token });
      const get = (route) => fetch(origin + route, {
        headers: { cookie: salt + "=" + value }, redirect: "manual",
      });
      const session = await get("/api/auth/session");
      assert.equal(session.status, 200);
      const data = await session.json();
      if (state === "valid") {
        assert.equal(data.user.name, token.name);
        assert.deepEqual(Object.keys(data).sort(), ["expires", "user"]);
      } else {
        assert.equal(data, null);
        if (path) {
          const target = path + "?from=test";
          const rejected = await get(target);
          assert.equal(rejected.status, 307);
          const location = new URL(rejected.headers.get("location"), origin);
          assert.equal(location.pathname, "/login");
          assert.equal(location.searchParams.get("callbackUrl"), target);
          assert.equal((await get("/api/fixture")).status, 401);
        }
      }
    }
  });
}
