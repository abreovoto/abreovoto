import { afterEach, beforeEach, expect, test, vi } from "vitest";
import worker from "../worker/index";
import type { Deps } from "../worker/fonte";
import { handlePeticao, handleScheduled, type KvStore, type PeticaoEnv } from "../worker/peticao";
import { KV_KEY, PETITION_USER_AGENT } from "../worker/peticao-count";

const URL_A = "https://www.change.org/p/a";
const PAGE = '<script>"signatureCount":{"minimum":100,"maximum":20000} "signatureCount":{"displayed":39,"total":39,"goal":50}</script>';
const NOW = "2026-11-10T12:00:00.000Z";

type Kv = KvStore & { puts: [string, string][]; data: Map<string, string> };

function kv(initial: Record<string, string> = {}): Kv {
  const data = new Map(Object.entries(initial));
  const puts: [string, string][] = [];
  return {
    data,
    puts,
    get: async (key) => data.get(key) ?? null,
    put: async (key, value) => {
      puts.push([key, value]);
      data.set(key, value);
    },
  };
}

function env(peticao: { url: string | null; contagem_manual: number }, store: Kv = kv(), over: Partial<PeticaoEnv> = {}): PeticaoEnv & { PETICAO_KV: Kv } {
  return {
    ASSETS: {
      fetch: async (r: Request) =>
        new URL(r.url).pathname === "/dados.json"
          ? Response.json({ peticao, senadores: [] })
          : new Response("asset", { status: 200 }),
    },
    PETICAO_KV: store,
    ...over,
  } as PeticaoEnv & { PETICAO_KV: Kv };
}

type Call = { url: string; init?: RequestInit };

/** A fetch that records every call and answers from a queue, the last answer repeating. */
function deps(...answers: (Response | Error)[]): Deps & { calls: Call[] } {
  const calls: Call[] = [];
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input instanceof Request ? input.url : input), init });
    const a = answers.length > 1 ? answers.shift()! : answers[0];
    if (a instanceof Error) throw a;
    return a.clone();
  }) as typeof globalThis.fetch;
  return { fetch, now: () => new Date(NOW), calls };
}

const logs: unknown[][] = [];
beforeEach(() => {
  logs.length = 0;
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const stored = (url: string, total: number) => JSON.stringify({ url, total, atualizadoEm: NOW });
const get = (path = "/api/peticao", method = "GET") => new Request(`https://abreovoto.com${path}`, { method });

test("the cron does nothing while the petition has no address", async () => {
  const e = env({ url: null, contagem_manual: 0 });
  const d = deps(new Response(PAGE));
  await handleScheduled(e, d);
  expect(d.calls).toHaveLength(0);
  expect(e.PETICAO_KV.puts).toHaveLength(0);
  expect(logs).toEqual([["peticao", "sem-url"]]);
});

test("the cron fetches the page with a browser user agent and stores {url,total,atualizadoEm}", async () => {
  const e = env({ url: URL_A, contagem_manual: 0 });
  const d = deps(new Response(PAGE));
  await handleScheduled(e, d);
  expect(d.calls).toHaveLength(1);
  expect(d.calls[0].url).toBe(URL_A);
  const headers = d.calls[0].init?.headers as Record<string, string>;
  expect(headers["user-agent"]).toBe(PETITION_USER_AGENT);
  expect(d.calls[0].init?.signal).toBeDefined();
  expect(e.PETICAO_KV.puts).toEqual([[KV_KEY, JSON.stringify({ url: URL_A, total: 39, atualizadoEm: NOW })]]);
  expect(logs).toEqual([["peticao", "ok"]]);
});

test.each([403, 429, 500, 503])("an HTTP %s writes nothing and keeps the last value", async (status) => {
  const e = env({ url: URL_A, contagem_manual: 0 }, kv({ [KV_KEY]: stored(URL_A, 30) }));
  await handleScheduled(e, deps(new Response(PAGE, { status })));
  expect(e.PETICAO_KV.puts).toHaveLength(0);
  expect(e.PETICAO_KV.data.get(KV_KEY)).toBe(stored(URL_A, 30));
  expect(logs).toEqual([["peticao", `http-${status}`]]);
});

test("a page without a usable total writes nothing", async () => {
  const e = env({ url: URL_A, contagem_manual: 0 });
  await handleScheduled(e, deps(new Response("<html>no count</html>")));
  expect(e.PETICAO_KV.puts).toHaveLength(0);
  expect(logs).toEqual([["peticao", "sem-total"]]);
});

test("a network error or timeout writes nothing", async () => {
  const e = env({ url: URL_A, contagem_manual: 0 });
  await handleScheduled(e, deps(new TypeError("network")));
  await handleScheduled(e, deps(new DOMException("timed out", "TimeoutError")));
  await handleScheduled(e, deps(new DOMException("aborted", "AbortError")));
  expect(e.PETICAO_KV.puts).toHaveLength(0);
  expect(logs).toEqual([
    ["peticao", "rede"],
    ["peticao", "tempo"],
    ["peticao", "tempo"],
  ]);
});

test("PETICAO_URL overrides the data file for the cron and for the route", async () => {
  const e = env({ url: null, contagem_manual: 3 }, kv(), { PETICAO_URL: URL_A });
  const d = deps(new Response(PAGE));
  await handleScheduled(e, d);
  expect(d.calls[0].url).toBe(URL_A);
  const res = await handlePeticao(get(), e);
  expect(await res.json()).toEqual({ total: 39, atualizadoEm: NOW, origem: "changeorg" });
});

test("GET /api/peticao serves the stored value for the current petition, cached for a minute", async () => {
  const e = env({ url: URL_A, contagem_manual: 0 }, kv({ [KV_KEY]: stored(URL_A, 812) }));
  const res = await handlePeticao(get(), e);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
  expect(await res.json()).toEqual({ total: 812, atualizadoEm: NOW, origem: "changeorg" });
});

test("GET /api/peticao falls back to the manual figure when KV is empty or names another petition", async () => {
  const manual = { total: 7, atualizadoEm: null, origem: "manual" };
  for (const store of [kv(), kv({ [KV_KEY]: stored("https://www.change.org/p/b", 812) }), kv({ [KV_KEY]: "not json" })]) {
    const res = await handlePeticao(get(), env({ url: URL_A, contagem_manual: 7 }, store));
    expect(await res.json()).toEqual(manual);
  }
});

test("a POST to /api/peticao is refused", async () => {
  const res = await handlePeticao(get("/api/peticao", "POST"), env({ url: URL_A, contagem_manual: 0 }));
  expect(res.status).toBe(405);
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(await res.json()).toEqual({ erro: "metodo" });
});

test("the default export carries scheduled and routes /api/peticao through fetch", async () => {
  const e = env({ url: null, contagem_manual: 0 });
  const full = { ...e, FONTE_LIMIT: { limit: async () => ({ success: true }) } };
  const waited: Promise<unknown>[] = [];
  worker.scheduled({}, full, { waitUntil: (p: Promise<unknown>) => waited.push(p) });
  expect(waited).toHaveLength(1);
  await waited[0];
  const res = await worker.fetch(get(), full);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ total: 0, atualizadoEm: null, origem: "manual" });
});
