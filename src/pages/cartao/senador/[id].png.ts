import type { APIRoute, GetStaticPaths } from "astro";
import { loadData } from "../../../data/load";
import { todayUtc } from "../../../data/schema";
import { photoFile, portraitDataUri, renderCard } from "../../../lib/card-render";
import { senatorCard } from "../../../lib/share-card";

const d = loadData();

/** Every senator, in office or not: a former occupant's page still carries its card. */
export const getStaticPaths: GetStaticPaths = () => d.senadores.map((s) => ({ params: { id: s.id } }));

export const GET: APIRoute = async ({ params }) => {
  const s = d.senadores.find((x) => x.id === params.id)!;
  const png = await renderCard(senatorCard(s, d, todayUtc()), await portraitDataUri(photoFile("senadores", s.id)));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
