import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.MVP_BASE_URL || "https://www.mostrara.shop";

test("health endpoint returns ok", async () => {
  const res = await fetch(`${base}/api/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("public storefront returns 404 for unknown slug", async () => {
  const slug = `missing-${Date.now()}`;
  const res = await fetch(`${base}/api/store/${slug}`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
});

test("private products endpoint requires auth", async () => {
  const res = await fetch(`${base}/api/products`);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
});
