import { expect, test } from "vitest";
import { handle } from "../worker/index";

const env = { ASSETS: { fetch: async () => new Response("asset", { status: 200 }) } } as never;
const post = (fields: Record<string, string>) =>
  new Request("https://abreovoto.com/api/fonte", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });

test("GET /api/health answers ok and is never cached", async () => {
  const r = await handle(new Request("https://abreovoto.com/api/health"), env);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(r.headers.get("cache-control")).toBe("no-store");
});

test("POST /api/fonte lands on GitHub's prefilled new-issue page", async () => {
  const r = await handle(post({ senador: "Marcio Bittar", url: "https://example.org/x", comentario: "veja o vídeo", correcao: "on" }), env);
  expect(r.status).toBe(303);
  const u = new URL(r.headers.get("location")!);
  expect(u.origin + u.pathname).toBe("https://github.com/abreovoto/abreovoto/issues/new");
  expect(u.searchParams.get("labels")).toBe("data");
  expect(u.searchParams.get("title")).toBe("Marcio Bittar declarou voto / correção");
  const body = u.searchParams.get("body")!;
  expect(body).toContain("https://example.org/x");
  expect(body).toContain("veja o vídeo");
  expect(body).toContain("Correção: sim");
});

test("POST /api/fonte refuses a URL that is not https and caps the comment", async () => {
  const bad = await handle(post({ senador: "X", url: "javascript:alert(1)", comentario: "" }), env);
  expect(bad.status).toBe(400);
  expect(await bad.text()).toContain("https://");
  const long = await handle(post({ senador: "X", url: "https://example.org/x", comentario: "a".repeat(501) }), env);
  expect(long.status).toBe(303);
  expect(new URL(long.headers.get("location")!).searchParams.get("body")!).not.toContain("a".repeat(501));
  expect(long.headers.get("location")!.length).toBeLessThan(8192);
});

test("other API paths are 404, other methods 405, everything else is an asset", async () => {
  expect((await handle(new Request("https://abreovoto.com/api/nada"), env)).status).toBe(404);
  expect((await handle(new Request("https://abreovoto.com/api/fonte"), env)).status).toBe(405);
  expect(await (await handle(new Request("https://abreovoto.com/senador/x/"), env)).text()).toBe("asset");
});
