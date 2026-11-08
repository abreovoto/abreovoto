/**
 * The petition counter. A cron reads the petition page every 15 minutes and keeps its total in
 * one KV value; GET /api/peticao serves that value while it names the current petition, and the
 * manual figure from data/peticao.yaml otherwise. Nothing from the visitor's request is read
 * but its method and path, and the log carries the outcome code only.
 */
import { type Deps, type FonteEnv, defaultDeps } from "./fonte";
import { KV_KEY, PETITION_USER_AGENT, parseSignatureCount, peticaoAnswer, type PeticaoStored } from "./peticao-count";

export type KvStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export type PeticaoEnv = {
  ASSETS: FonteEnv["ASSETS"];
  PETICAO_KV: KvStore;
  /** Overrides the data file's address: a local proof against a public petition, never committed. */
  PETICAO_URL?: string;
};

type Dados = { peticao: { url: string | null; contagem_manual: number } };

const TIMEOUT_MS = 10_000;
// The deployed open-data file; the host is irrelevant to the assets binding.
const DADOS = "https://abreovoto.com/dados.json";

const log = (code: string): void => console.log("peticao", code);

async function dados(env: PeticaoEnv): Promise<Dados> {
  const r = await env.ASSETS.fetch(new Request(DADOS));
  if (!r.ok) throw new Error(`dados.json ${r.status}`);
  return (await r.json()) as Dados;
}

export const currentUrl = (env: PeticaoEnv, d: Dados): string | null => env.PETICAO_URL ?? d.peticao.url;

/** One run of the cron: on any failure nothing is written, so the last good value stays. */
export async function handleScheduled(env: PeticaoEnv, deps: Deps = defaultDeps): Promise<void> {
  const url = currentUrl(env, await dados(env));
  if (url === null) return log("sem-url");
  try {
    const res = await deps.fetch(url, {
      headers: { "user-agent": PETITION_USER_AGENT, accept: "text/html" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return log(`http-${res.status}`);
    const total = parseSignatureCount(await res.text());
    if (total === null) return log("sem-total");
    const value: PeticaoStored = { url, total, atualizadoEm: deps.now().toISOString() };
    await env.PETICAO_KV.put(KV_KEY, JSON.stringify(value));
    log("ok");
  } catch (e) {
    const name = (e as { name?: unknown } | null)?.name;
    log(name === "TimeoutError" || name === "AbortError" ? "tempo" : "rede");
  }
}

function readStored(raw: string | null): PeticaoStored | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as PeticaoStored;
  } catch {
    return null;
  }
}

const json = (status: number, body: unknown, cache: string): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });

/** GET /api/peticao: the total the home shows, never from a petition other than the current one. */
export async function handlePeticao(request: Request, env: PeticaoEnv): Promise<Response> {
  if (request.method !== "GET") return json(405, { erro: "metodo" }, "no-store");
  const [raw, d] = await Promise.all([env.PETICAO_KV.get(KV_KEY), dados(env)]);
  return json(200, peticaoAnswer(readStored(raw), currentUrl(env, d), d.peticao.contagem_manual), "public, max-age=60");
}
