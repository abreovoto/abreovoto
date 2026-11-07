import { type Deps, type FonteEnv, defaultDeps, handleFonte } from "./fonte";

export type Env = FonteEnv;

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
  return json({ erro: "não encontrado" }, 404);
}

export default { fetch: handle };
