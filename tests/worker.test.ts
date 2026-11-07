import { afterEach, beforeEach, expect, test, vi } from "vitest";
import worker, { handle } from "../worker/index";
import { _resetSeatsCache, type Deps, type FonteEnv } from "../worker/fonte";

const dados = JSON.stringify({
  senadores: [{ id: "marcio-bittar", nome: "Marcio Bittar", partido: "PL", uf: "AC", pagina: "https://abreovoto.com/senador/marcio-bittar/" }],
});

let assetCalls = 0;
function env(over: Partial<FonteEnv> = {}, limited = false): FonteEnv {
  return {
    ASSETS: {
      fetch: async (r: Request) => {
        if (new URL(r.url).pathname === "/dados.json") {
          assetCalls++;
          return new Response(dados, { headers: { "content-type": "application/json" } });
        }
        return new Response("asset", { status: 200 });
      },
    },
    FONTE_LIMIT: { limit: async () => ({ success: !limited }) },
    TURNSTILE_SECRET: "s",
    GITHUB_TOKEN: "g",
    ...over,
  };
}

type Answer = Response | Error;
type Call = { url: string; init?: RequestInit };

/** A fetch that records every outside call and answers by host, one queued answer at a time. */
function deps(turnstile: Answer | Answer[], github: Answer | Answer[]): Deps & { calls: Call[] } {
  const queues: Record<string, Answer[]> = {
    "challenges.cloudflare.com": [turnstile].flat(),
    "api.github.com": [github].flat(),
  };
  const calls: Call[] = [];
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    const q = queues[new URL(url).host];
    const a = q.length > 1 ? q.shift()! : q[0];
    if (a instanceof Error) throw a;
    return a.clone();
  }) as typeof globalThis.fetch;
  return { fetch, now: () => new Date("2026-11-07T14:05:00Z"), calls };
}

const verified = () => Response.json({ success: true, "error-codes": [] });
const created = () => Response.json({ number: 57, html_url: "https://github.com/abreovoto/abreovoto/issues/57" }, { status: 201 });

const post = (body: unknown, type = "application/json") =>
  new Request("https://abreovoto.com/api/fonte", {
    method: "POST",
    headers: { "content-type": type, "cf-connecting-ip": "203.0.113.9" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const good = { senador: "marcio-bittar", url: "https://g1.globo.com/x", comentario: "", correcao: false, token: "tok" };

const githubCalls = (d: { calls: Call[] }) => d.calls.filter((c) => c.url.startsWith("https://api.github.com/"));
const seen: Response[] = [];
const run = async (r: Request, e: FonteEnv, d: Deps) => {
  const res = await handle(r, e, d);
  seen.push(res);
  return res;
};

beforeEach(() => {
  _resetSeatsCache();
  assetCalls = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("the runtime entry point reaches the outside services with the global fetch", async () => {
  // The runtime calls fetch(request, env, ctx): the context must not stand in for the injected deps.
  const d = deps(verified(), created());
  vi.stubGlobal("fetch", d.fetch);
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} };
  const runtimeFetch = worker.fetch as (r: Request, e: FonteEnv, c: unknown) => Promise<Response>;
  const r = await runtimeFetch(post(good), env(), ctx);
  expect(r.status).toBe(201);
  expect(d.calls.map((c) => new URL(c.url).host)).toEqual(["challenges.cloudflare.com", "api.github.com"]);
});

test("GET /api/health answers ok and is never cached", async () => {
  const r = await handle(new Request("https://abreovoto.com/api/health"), env());
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(r.headers.get("cache-control")).toBe("no-store");
});

test("no API route sends a visitor to GitHub", async () => {
  const bad = new Request("https://abreovoto.com/api/fonte", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ senador: "X", url: "https://example.org/x" }).toString(),
  });
  const r = await handle(bad, env(), deps(verified(), created()));
  expect(r.status).toBe(400);
  expect(r.headers.get("location")).toBeNull();
});

test("other API paths are 404 JSON, everything else is an asset", async () => {
  const r = await handle(new Request("https://abreovoto.com/api/nada"), env());
  expect(r.status).toBe(404);
  expect(await r.json()).toEqual({ erro: "não encontrado" });
  expect(await (await handle(new Request("https://abreovoto.com/senador/x/"), env())).text()).toBe("asset");
});

test("a valid submission opens the issue and answers the protocol", async () => {
  const d = deps(verified(), created());
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(201);
  expect(await r.json()).toEqual({ protocolo: 57, url: "https://github.com/abreovoto/abreovoto/issues/57" });
  expect(r.headers.get("cache-control")).toBe("no-store");
  const gh = githubCalls(d);
  expect(gh).toHaveLength(1);
  expect(gh[0].url).toBe("https://api.github.com/repos/abreovoto/abreovoto/issues");
  const issue = JSON.parse(String(gh[0].init?.body));
  expect(issue.title).toBe("Fonte enviada: Marcio Bittar (PL-AC)");
  expect(issue.labels).toEqual(["data"]);
  const sv = d.calls.find((c) => c.url.includes("challenges.cloudflare.com"))!;
  expect(sv.init?.method).toBe("POST");
  expect(sv.init?.body).toBeInstanceOf(URLSearchParams);
  expect((sv.init?.body as URLSearchParams).get("remoteip")).toBe("203.0.113.9");
});

test("the form-encoded shape with cf-turnstile-response works the same", async () => {
  const { token: _, ...rest } = good;
  const body = new URLSearchParams({ ...rest, correcao: "on", "cf-turnstile-response": "tok" } as Record<string, string>).toString();
  const d = deps(verified(), created());
  const r = await run(post(body, "application/x-www-form-urlencoded"), env(), d);
  expect(r.status).toBe(201);
  expect(JSON.parse(String(githubCalls(d)[0].init?.body)).body).toContain("Correção do que o site mostra: sim");
});

test("a rate-limited request answers 429 before any outside call", async () => {
  const d = deps(verified(), created());
  const r = await run(post(good), env({}, true), d);
  expect(r.status).toBe(429);
  expect(await r.json()).toEqual({ erro: "limite" });
  expect(d.calls).toEqual([]);
});

test("a failed challenge answers 403 and never reaches GitHub", async () => {
  const d = deps(Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] }), created());
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(403);
  expect(await r.json()).toEqual({ erro: "turnstile", codigos: ["timeout-or-duplicate"] });
  expect(githubCalls(d)).toEqual([]);
});

test("a missing token is a field error without a siteverify call", async () => {
  const d = deps(verified(), created());
  const r = await run(post({ ...good, token: "" }), env(), d);
  expect(r.status).toBe(400);
  expect(await r.json()).toEqual({ erro: "campo", campo: "token" });
  expect(d.calls).toEqual([]);
});

test("an unknown senator and the literal site", async () => {
  const r = await run(post({ ...good, senador: "x" }), env(), deps(verified(), created()));
  expect(r.status).toBe(400);
  expect(await r.json()).toEqual({ erro: "campo", campo: "senador" });
  const d = deps(verified(), created());
  const s = await run(post({ ...good, senador: "site" }), env(), d);
  expect(s.status).toBe(201);
  expect(JSON.parse(String(githubCalls(d)[0].init?.body)).title).toBe("Correção: site");
});

test("GitHub 5xx is retried once and then 502", async () => {
  const d = deps(verified(), [new Response("", { status: 502 }), new Response("", { status: 502 })]);
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(502);
  expect(await r.json()).toEqual({ erro: "github" });
  expect(githubCalls(d)).toHaveLength(2);
});

test("GitHub 401 is a configuration error, not retried", async () => {
  const d = deps(verified(), new Response("", { status: 401 }));
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(500);
  expect(await r.json()).toEqual({ erro: "configuracao" });
  expect(githubCalls(d)).toHaveLength(1);
});

test("no secret is a configuration error before siteverify", async () => {
  const d = deps(verified(), created());
  const r = await run(post(good), env({ TURNSTILE_SECRET: undefined }), d);
  expect(r.status).toBe(500);
  expect(await r.json()).toEqual({ erro: "configuracao" });
  expect(d.calls).toEqual([]);
});

test("siteverify unreachable twice answers 503", async () => {
  const d = deps(new Error("network"), created());
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({ erro: "verificacao" });
  expect(d.calls.filter((c) => c.url.includes("challenges.cloudflare.com"))).toHaveLength(2);
  expect(githubCalls(d)).toEqual([]);
});

test("a body over 8 KB is refused before parsing", async () => {
  const r = await run(post("x".repeat(8193)), env(), deps(verified(), created()));
  expect(r.status).toBe(400);
  expect(await r.json()).toEqual({ erro: "campo", campo: "corpo" });
});

test("a GET on the route is 405", async () => {
  const r = await run(new Request("https://abreovoto.com/api/fonte"), env(), deps(verified(), created()));
  expect(r.status).toBe(405);
  expect(await r.json()).toEqual({ erro: "metodo" });
});

test("an unreadable seat list is a transient error, and is read again next time", async () => {
  const broken = env({ ASSETS: { fetch: async () => new Response("", { status: 500 }) } });
  const r = await run(post(good), broken, deps(verified(), created()));
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({ erro: "dados" });
  expect((await run(post(good), env(), deps(verified(), created()))).status).toBe(201);
});

test("the seat list is read once", async () => {
  await run(post(good), env(), deps(verified(), created()));
  await run(post(good), env(), deps(verified(), created()));
  expect(assetCalls).toBe(1);
});

test("no response is a redirect and none carries location", () => {
  expect(seen.length).toBeGreaterThan(10);
  for (const r of seen) {
    expect(r.status < 300 || r.status >= 400).toBe(true);
    expect(r.headers.get("location")).toBeNull();
    expect(r.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(r.headers.get("cache-control")).toBe("no-store");
  }
});

test("a retried siteverify carries the same idempotency key, so a lost reply is not a duplicate", async () => {
  const d = deps([new Error("network"), verified()], created());
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(201);
  const keys = d.calls
    .filter((c) => c.url.includes("challenges.cloudflare.com"))
    .map((c) => (c.init?.body as URLSearchParams).get("idempotency_key"));
  expect(keys).toHaveLength(2);
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(keys[1]).toBe(keys[0]);
});

test.each(["invalid-input-secret", "missing-input-secret"])("siteverify %s is a configuration error, not a bot", async (code) => {
  const d = deps(Response.json({ success: false, "error-codes": [code] }), created());
  const r = await run(post(good), env(), d);
  expect(r.status).toBe(500);
  expect(await r.json()).toEqual({ erro: "configuracao" });
  expect(githubCalls(d)).toEqual([]);
});

test("a declared length over 8 KB is refused without reading the body", async () => {
  const req = new Request("https://abreovoto.com/api/fonte", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "9000" },
    body: JSON.stringify(good),
  });
  const r = await run(req, env(), deps(verified(), created()));
  expect(r.status).toBe(400);
  expect(await r.json()).toEqual({ erro: "campo", campo: "corpo" });
  expect(req.bodyUsed).toBe(false);
});
