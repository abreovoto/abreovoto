/**
 * The daily rebuild. The site is static and some of its sentences depend on the date it was
 * built ("assume a vaga" turning into "assumiu", the scoreboard's "atualizado em", gerado_em in
 * /dados.json). A cron just after midnight in Brasília posts to the Workers Builds deploy hook,
 * which rebuilds main as it stands, so those sentences follow the calendar even on a day with no
 * commit. The hook URL is a secret: anyone holding it can start a build.
 */
import { type Deps, defaultDeps } from "./fonte";

/** 03:05 UTC is 00:05 in Brasília, so the build's UTC date is already the new day there. */
export const REBUILD_CRON = "5 3 * * *";

export type RebuildEnv = {
  /** The deploy hook for main, from the Worker's settings; absent in previews and local dev. */
  DEPLOY_HOOK_URL?: string;
};

const TIMEOUT_MS = 10_000;

const log = (code: string): void => console.log("rebuild", code);

/** One run of the daily cron; the log carries the outcome code only, never the hook URL. */
export async function handleRebuild(env: RebuildEnv, deps: Deps = defaultDeps): Promise<void> {
  if (!env.DEPLOY_HOOK_URL) return log("sem-hook");
  try {
    const res = await deps.fetch(env.DEPLOY_HOOK_URL, { method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS) });
    log(res.ok ? "ok" : `http-${res.status}`);
  } catch (e) {
    const name = (e as { name?: unknown } | null)?.name;
    log(name === "TimeoutError" || name === "AbortError" ? "tempo" : "rede");
  }
}
