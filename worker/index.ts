export type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

export async function handle(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (pathname === "/api/health") return json({ ok: true }, 200, { "cache-control": "no-store" });
  return json({ erro: "não encontrado" }, 404);
}

export default { fetch: handle };
