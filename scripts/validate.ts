import { existsSync } from "node:fs";

if (!existsSync("data")) {
  console.log("validate: no data yet");
  process.exit(0);
}
