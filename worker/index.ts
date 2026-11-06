export type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

const NEW_ISSUE = "https://github.com/abreovoto/abreovoto/issues/new";
const MAX_URL = 2000;
const MAX_COMMENT = 500;
const MAX_NAME = 120;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });

function httpsUrl(raw: string): string | null {
  if (raw.length === 0 || raw.length > MAX_URL) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

async function fonte(request: Request): Promise<Response> {
  if (request.method !== "POST") return text("Método não permitido", 405, { allow: "POST" });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return text("Formulário inválido", 400);
  }
  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v.trim() : "";
  };
  const url = httpsUrl(field("url"));
  if (!url) return text("O link precisa começar com https://", 400);
  const senador = field("senador").slice(0, MAX_NAME) || "Senador(a)";
  const comentario = field("comentario").slice(0, MAX_COMMENT);
  const correcao = field("correcao") !== "";

  const body = [
    "## Senador(a)",
    "",
    senador,
    "",
    "## Fonte",
    "",
    url,
    "",
    "## Comentário",
    "",
    comentario,
    "",
    `Correção: ${correcao ? "sim" : "não"}`,
  ].join("\n");
  const target = new URL(NEW_ISSUE);
  target.searchParams.set("labels", "data");
  target.searchParams.set("title", `${senador} declarou voto / correção`);
  target.searchParams.set("body", body);
  return new Response(null, { status: 303, headers: { location: target.toString() } });
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (pathname === "/api/health") return json({ ok: true }, 200, { "cache-control": "no-store" });
  if (pathname === "/api/fonte") return fonte(request);
  return json({ erro: "não encontrado" }, 404);
}

export default { fetch: handle };
