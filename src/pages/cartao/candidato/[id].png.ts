import type { APIRoute, GetStaticPaths } from "astro";
import { loadData } from "../../../data/load";
import { placar } from "../../../data/placar";
import { todayUtc } from "../../../data/schema";
import { photoFile, portraitDataUri, renderCard } from "../../../lib/card-render";
import { candidateCard } from "../../../lib/share-card";

const d = loadData();
const candidates = placar(d).porCandidato;

export const getStaticPaths: GetStaticPaths = () => candidates.map((c) => ({ params: { id: c.id } }));

export const GET: APIRoute = async ({ params }) => {
  const c = candidates.find((x) => x.id === params.id)!;
  const png = await renderCard(candidateCard(c, d, todayUtc()), await portraitDataUri(photoFile("candidatos", c.id)));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
