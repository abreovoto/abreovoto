// Replaces the build-time count with the live one. A route that is down, slow or answers
// something unexpected leaves the page as it was built, with nothing shown in the console.
import { applyLiveTotal, PETITION_API } from "../lib/petition";

const blocks = document.querySelectorAll<HTMLElement>("[data-petition]");
if (blocks.length > 0) {
  fetch(PETITION_API, { headers: { accept: "application/json" } })
    .then((r) => r.json())
    .then((j: { total?: unknown } | null) => blocks.forEach((b) => applyLiveTotal(b, j?.total)))
    .catch(() => {});
}
