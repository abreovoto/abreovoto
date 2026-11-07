/**
 * POST /api/fonte: a visitor's source or correction becomes a public record on the repository.
 * Each check fails fast, in an order that protects the outside services: the limiter answers
 * before Turnstile is called, and a failed challenge never reaches GitHub.
 */
import { issueFor, LIMITS, parseSubmission, type Seat } from "./fonte-issue";

export type RateLimiter = { limit(opts: { key: string }): Promise<{ success: boolean }> };

export type FonteEnv = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  FONTE_LIMIT: RateLimiter;
  TURNSTILE_SECRET?: string;
  GITHUB_TOKEN?: string;
};

export type Deps = { fetch: typeof fetch; now: () => Date };

export const defaultDeps: Deps = { fetch: (input, init) => fetch(input, init), now: () => new Date() };

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ISSUES = "https://api.github.com/repos/abreovoto/abreovoto/issues";
const TIMEOUT_MS = 10_000;

/** Every answer is JSON, never cached, never a redirect. The log carries the outcome code only. */
function answer(status: number, body: Record<string, unknown>, code: string): Response {
  console.log("fonte", code);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
const fail = (status: number, erro: string, extra: Record<string, unknown> = {}) =>
  answer(status, { erro, ...extra }, erro);

let seatsCache: Promise<Map<string, Seat>> | null = null;

export const _resetSeatsCache = (): void => {
  seatsCache = null;
};

/** Every seat holder, past and present, from the deployed open-data file; read once per isolate. */
export function seats(env: FonteEnv, request: Request): Promise<Map<string, Seat>> {
  seatsCache ??= (async () => {
    const r = await env.ASSETS.fetch(new Request(new URL("/dados.json", request.url)));
    if (!r.ok) throw new Error(`dados.json ${r.status}`);
    const { senadores } = (await r.json()) as { senadores: Seat[] };
    return new Map(senadores.map((s) => [s.id, { id: s.id, nome: s.nome, partido: s.partido, uf: s.uf, pagina: s.pagina }]));
  })().catch((e: unknown) => {
    seatsCache = null;
    throw e;
  });
  return seatsCache;
}

function parseBody(text: string, type: string): Record<string, unknown> | null {
  const mime = type.split(";")[0].trim().toLowerCase();
  if (mime === "application/json") {
    try {
      const v: unknown = JSON.parse(text);
      return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (mime === "application/x-www-form-urlencoded") {
    const o: Record<string, unknown> = Object.fromEntries(new URLSearchParams(text));
    if (o.token === undefined && o["cf-turnstile-response"] !== undefined) o.token = o["cf-turnstile-response"];
    return o;
  }
  return null;
}

type Verdict = { success: boolean; codes: unknown } | null;

async function siteverify(deps: Deps, secret: string, token: string, ip: string): Promise<Verdict> {
  // The same key on the retry: if the first reply was lost, the token is not judged a duplicate.
  const idempotency_key = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await deps.fetch(SITEVERIFY, {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: ip, idempotency_key }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const v = (await r.json()) as { success?: unknown; "error-codes"?: unknown };
      return { success: v.success === true, codes: v["error-codes"] ?? [] };
    } catch {
      // Unreachable, timed out or not JSON: one more try.
    }
  }
  return null;
}

/** A wrong or missing secret is the site's fault, not the visitor's. */
const secretRefused = (codes: unknown): boolean =>
  Array.isArray(codes) && codes.some((c) => c === "invalid-input-secret" || c === "missing-input-secret");

type Opened = { kind: "created"; number: number; url: string } | { kind: "refused" } | { kind: "down" };

async function openIssue(deps: Deps, token: string, issue: ReturnType<typeof issueFor>): Promise<Opened> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await deps.fetch(ISSUES, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "content-type": "application/json",
          "user-agent": "abreovoto.com (formulario de fonte)",
        },
        body: JSON.stringify(issue),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (r.status >= 500) continue;
      if (r.status !== 201) return { kind: "refused" };
      const { number, html_url } = (await r.json()) as { number: number; html_url: string };
      return { kind: "created", number, url: html_url };
    } catch {
      // Network error or timeout: one more try.
    }
  }
  return { kind: "down" };
}

export async function handleFonte(request: Request, env: FonteEnv, deps: Deps = defaultDeps): Promise<Response> {
  if (request.method !== "POST") return fail(405, "metodo");

  if (Number(request.headers.get("content-length") ?? 0) > LIMITS.body) return fail(400, "campo", { campo: "corpo" });
  const text = await request.text();
  if (text.length > LIMITS.body) return fail(400, "campo", { campo: "corpo" });
  const raw = parseBody(text, request.headers.get("content-type") ?? "");
  if (raw === null) return fail(400, "campo", { campo: "corpo" });

  let seatMap: Map<string, Seat>;
  try {
    seatMap = await seats(env, request);
  } catch {
    return fail(503, "dados");
  }
  const parsed = parseSubmission(raw, new Set(seatMap.keys()));
  if ("campo" in parsed) return fail(400, "campo", { campo: parsed.campo });

  const ip = request.headers.get("cf-connecting-ip") ?? "0";
  if (!(await env.FONTE_LIMIT.limit({ key: ip })).success) return fail(429, "limite");

  if (!env.TURNSTILE_SECRET || !env.GITHUB_TOKEN) return fail(500, "configuracao");

  const verdict = await siteverify(deps, env.TURNSTILE_SECRET, parsed.token, ip);
  if (verdict === null) return fail(503, "verificacao");
  if (secretRefused(verdict.codes)) return fail(500, "configuracao");
  if (!verdict.success) return fail(403, "turnstile", { codigos: verdict.codes });

  const seat = parsed.senador === "site" ? null : (seatMap.get(parsed.senador) ?? null);
  const opened = await openIssue(deps, env.GITHUB_TOKEN, issueFor(parsed, seat, deps.now()));
  if (opened.kind === "refused") return fail(500, "configuracao");
  if (opened.kind === "down") return fail(502, "github");
  return answer(201, { protocolo: opened.number, url: opened.url }, "criado");
}
