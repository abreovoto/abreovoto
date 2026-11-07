import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

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
