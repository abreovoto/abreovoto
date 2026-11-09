import { type Deps, type FonteEnv, defaultDeps, handleFonte } from "./fonte";
import { handlePeticao, handleScheduled, type PeticaoEnv } from "./peticao";
import { handleRebuild, REBUILD_CRON, type RebuildEnv } from "./rebuild";

export type Env = FonteEnv & PeticaoEnv & RebuildEnv;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

export async function handle(request: Request, env: Env, deps: Deps = defaultDeps): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (pathname === "/api/health") return json({ ok: true }, 200, { "cache-control": "no-store" });
  if (pathname === "/api/fonte") return handleFonte(request, env, deps);
  if (pathname === "/api/peticao") return handlePeticao(request, env);
  return json({ erro: "não encontrado" }, 404);
}

type Context = { waitUntil(promise: Promise<unknown>): void };

// The runtime calls fetch(request, env, ctx); the context is not the injected deps.
export default {
  fetch: (request: Request, env: Env): Promise<Response> => handle(request, env),
  // Two crons: the daily rebuild, and every other one the petition counter.
  scheduled: (controller: { cron?: string }, env: Env, ctx: Context): void =>
    ctx.waitUntil(controller.cron === REBUILD_CRON ? handleRebuild(env) : handleScheduled(env)),
};
