import type { APIRoute } from "astro";
import { loadData } from "../../data/load";
import { todayUtc } from "../../data/schema";
import { renderCard } from "../../lib/card-render";
import { homeCard } from "../../lib/share-card";

export const GET: APIRoute = async () => {
  const png = await renderCard(homeCard(loadData(), todayUtc()), null);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
