// The web app's theme is saved with the viewer's preferences (PUT /api/user/preferences): an id
// like "minimal" is kept, anything else (markup, a long string, a number) is dropped.
import { test } from "node:test";
import assert from "node:assert/strict";

test("preferences: theme keeps a short id, drops anything else", async () => {
  const { initDB } = await import("../src/db");
  await initDB();
  const { createJWT } = await import("../src/auth/jwt");
  const { User } = await import("../src/models/User");
  const user = await User.create({ email: "theme@example.com", name: "T", role: "user", isActive: true } as any);
  const Hapi = await import("@hapi/hapi");
  const { userRoutes } = await import("../src/routes/account/user");
  const server = Hapi.server();
  server.route(userRoutes);
  const headers = { authorization: `Bearer ${createJWT({ userId: user.id, email: user.email, role: user.role }, 600)}` };
  const save = async (theme: unknown) =>
    ((await server.inject({ method: "PUT", url: "/api/user/preferences", headers, payload: { theme } })).result as any)
      ?.preferences?.theme;

  assert.equal(await save("minimal"), "minimal");
  assert.equal(await save("<script>"), "minimal"); // refused: the saved one stays
  assert.equal(await save("x".repeat(33)), "minimal");
  assert.equal(await save(7), "minimal");
  assert.equal(await save("classic"), "classic");
});
