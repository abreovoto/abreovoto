import { loadData } from "../data/load";
import { todayUtc } from "../data/schema";
import { openData } from "../lib/open-data";

export function GET(): Response {
  return new Response(JSON.stringify(openData(loadData(), todayUtc()), null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
