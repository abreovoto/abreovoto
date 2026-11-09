import { afterEach, beforeEach, expect, test, vi } from "vitest";
import worker, { type Env } from "../worker/index";
import type { Deps } from "../worker/fonte";
import { handleRebuild, REBUILD_CRON } from "../worker/rebuild";

const HOOK = "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test-hook";

type Call = { url: string; init?: RequestInit };

function deps(answer: Response | Error): Deps & { calls: Call[] } {
  const calls: Call[] = [];
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (answer instanceof Error) throw answer;
    return answer.clone();
  }) as typeof globalThis.fetch;
  return { fetch, now: () => new Date(), calls };
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

test("the rebuild runs just after midnight in Brasília, on the new day's UTC date", () => {
  const [min, hour] = REBUILD_CRON.split(" ").map(Number);
  const utc = new Date(Date.UTC(2027, 0, 6, hour, min));
  // Brasília is UTC−3 with no daylight saving time.
  const brasilia = new Date(utc.getTime() - 3 * 3600_000);
  expect(brasilia.getUTCHours()).toBe(0);
  expect(utc.toISOString().slice(0, 10)).toBe(brasilia.toISOString().slice(0, 10));
});

test("without a hook the cron calls nothing", async () => {
  const d = deps(new Response("{}"));
  await handleRebuild({}, d);
  expect(d.calls).toHaveLength(0);
  expect(logs).toEqual([["rebuild", "sem-hook"]]);
});

test("the cron posts to the hook, with a timeout, and logs no URL", async () => {
  const d = deps(new Response('{"success":true}'));
  await handleRebuild({ DEPLOY_HOOK_URL: HOOK }, d);
  expect(d.calls).toHaveLength(1);
  expect(d.calls[0].url).toBe(HOOK);
  expect(d.calls[0].init?.method).toBe("POST");
  expect(d.calls[0].init?.signal).toBeDefined();
  expect(logs).toEqual([["rebuild", "ok"]]);
});

test("a refused hook or a network failure is logged by code", async () => {
  await handleRebuild({ DEPLOY_HOOK_URL: HOOK }, deps(new Response("{}", { status: 404 })));
  await handleRebuild({ DEPLOY_HOOK_URL: HOOK }, deps(new TypeError("network")));
  await handleRebuild({ DEPLOY_HOOK_URL: HOOK }, deps(new DOMException("timed out", "TimeoutError")));
  expect(logs).toEqual([
    ["rebuild", "http-404"],
    ["rebuild", "rede"],
    ["rebuild", "tempo"],
  ]);
});

test("the Worker sends the daily cron to the rebuild and no other cron", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  const env = {
    DEPLOY_HOOK_URL: HOOK,
    ASSETS: { fetch: async () => Response.json({ peticao: { url: null, contagem_manual: 0 } }) },
  } as unknown as Env;
  const run = async (cron: string) => {
    const waited: Promise<unknown>[] = [];
    worker.scheduled({ cron }, env, { waitUntil: (p) => waited.push(p) });
    await Promise.all(waited);
  };
  await run("*/15 * * * *");
  expect(fetch).not.toHaveBeenCalled();
  expect(logs).toEqual([["peticao", "sem-url"]]);
  await run(REBUILD_CRON);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe(HOOK);
  expect(logs.at(-1)).toEqual(["rebuild", "ok"]);
});
