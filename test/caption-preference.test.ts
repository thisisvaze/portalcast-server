import { test } from "node:test";
import assert from "node:assert/strict";

test("Auto captions follow the signed-in account, including explicit Off", async () => {
  const { initDB } = await import("../src/db");
  await initDB();
  const { createJWT } = await import("../src/auth/jwt");
  const { User } = await import("../src/models/User");
  const Hapi = await import("@hapi/hapi");
  const { userRoutes } = await import("../src/routes/account/user");
  const server = Hapi.server();
  server.route(userRoutes);
  async function account(email: string) {
    const user = await User.create({ email, name: "Viewer", role: "user", isActive: true });
    return { authorization: `Bearer ${createJWT({ userId: user.id, email, role: user.role }, 600)}` };
  }
  const a = await account("a@example.com"), b = await account("b@example.com");
  async function read(headers: typeof a) {
    const res = await server.inject({ method: "GET", url: "/api/user/profile", headers });
    assert.equal(res.statusCode, 200);
    return JSON.parse(res.payload).preferences.autoEnglishCaptions;
  }
  async function save(value: unknown) {
    const res = await server.inject({ method: "PUT", url: "/api/user/preferences", headers: a, payload: { autoEnglishCaptions: value } });
    assert.equal(res.statusCode, 200);
  }
  await save(true);
  assert.equal(await read(a), true);
  assert.equal(await read(b), undefined);
  await save("false");
  assert.equal(await read(a), true);
  await save(false);
  assert.equal(await read(a), false);
});
