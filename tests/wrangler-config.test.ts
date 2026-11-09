import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { REBUILD_CRON } from "../worker/rebuild";

// wrangler.jsonc carries only whole-line comments.
const config = JSON.parse(
  readFileSync("wrangler.jsonc", "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n"),
);

test("the Worker keeps no per-request log, so no visitor IP is stored", () => {
  // Invocation logs record every request's headers, the visitor's IP among them.
  expect(config.observability).toEqual({ enabled: true, logs: { invocation_logs: false } });
  expect(config.previews.observability).toEqual({ enabled: true, logs: { invocation_logs: false } });
});

test("the counter and the daily rebuild have their crons, and KV bound so that previews and dev never write production", () => {
  expect(config.triggers).toEqual({ crons: ["*/15 * * * *", REBUILD_CRON] });
  expect(config.previews.triggers).toBeUndefined();
  const [kv] = config.kv_namespaces;
  expect(kv.binding).toBe("PETICAO_KV");
  expect(kv.id).toMatch(/^[0-9a-f]{32}$/);
  expect(kv.preview_id).toMatch(/^[0-9a-f]{32}$/);
  expect(kv.preview_id).not.toBe(kv.id);
  expect(config.previews.kv_namespaces).toEqual([{ binding: "PETICAO_KV", id: kv.preview_id }]);
});
