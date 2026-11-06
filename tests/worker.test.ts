import { expect, test } from "vitest";
import { handle } from "../worker/index";

const env = { ASSETS: { fetch: async () => new Response("asset", { status: 200 }) } } as never;

test("GET /api/health answers ok and is never cached", async () => {
  const r = await handle(new Request("https://abreovoto.com/api/health"), env);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(r.headers.get("cache-control")).toBe("no-store");
});

test("no API route sends a visitor to GitHub", async () => {
  const post = new Request("https://abreovoto.com/api/fonte", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ senador: "X", url: "https://example.org/x" }).toString(),
  });
  const r = await handle(post, env);
  expect(r.status).toBe(404);
  expect(r.headers.get("location")).toBeNull();
});

test("other API paths are 404 JSON, everything else is an asset", async () => {
  const r = await handle(new Request("https://abreovoto.com/api/nada"), env);
  expect(r.status).toBe(404);
  expect(await r.json()).toEqual({ erro: "não encontrado" });
  expect(await (await handle(new Request("https://abreovoto.com/senador/x/"), env)).text()).toBe("asset");
});
