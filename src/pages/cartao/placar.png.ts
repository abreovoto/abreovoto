import type { APIRoute } from "astro";
import { loadData } from "../../data/load";
import { todayUtc } from "../../data/schema";
import { homeFaces, renderCard } from "../../lib/card-render";
import { homeCard } from "../../lib/share-card";

export const GET: APIRoute = async () => {
  const model = homeCard(loadData(), todayUtc());
  const png = await renderCard(model, null, await homeFaces(model));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
