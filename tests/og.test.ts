import { expect, test } from "vitest";
import { asUndeclared, withoutPartySupport } from "./fixtures/undeclared";
import { loadData } from "../src/data/load";
import { ogTags } from "../src/lib/og";
import { cardVersion, homeCard, senatorCard } from "../src/lib/share-card";

const d = withoutPartySupport(loadData());
const today = "2026-11-07";

test("the tags carry the card, its version, its alt and the site's X account", () => {
  const s = asUndeclared(d.senadores.find((x) => x.id === "marcio-bittar")!);
  const model = senatorCard(s, d, today);
  const tags = ogTags({ title: "Marcio Bittar — Abre o Voto", description: "d", canonical: "https://abreovoto.com/senador/marcio-bittar/", card: { path: "/cartao/senador/marcio-bittar.png", model }, siteX: d.site.redes.x });
  const get = (k: string) => tags.find((t) => ("property" in t ? t.property : t.name) === k)?.content;
  expect(get("og:image")).toBe(`https://abreovoto.com/cartao/senador/marcio-bittar.png?v=${cardVersion(model)}`);
  expect(get("twitter:image")).toBe(get("og:image"));
  expect(get("og:image:alt")).toBe("Cartão do Abre o Voto: Marcio Bittar (PL-AC), não declarou, 7/11/2026");
  expect(get("og:url")).toBe("https://abreovoto.com/senador/marcio-bittar/");
  expect(get("twitter:card")).toBe("summary_large_image");
  expect(get("twitter:site")).toBe("@abreovoto");
  expect(get("og:locale")).toBe("pt_BR");
});

test("without a canonical there is no og:url", () => {
  const tags = ogTags({ title: "t", description: "d", canonical: null, card: { path: "/cartao/placar.png", model: homeCard(d, today) }, siteX: null });
  expect(tags.some((t) => "property" in t && t.property === "og:url")).toBe(false);
  expect(tags.some((t) => "name" in t && t.name === "twitter:site")).toBe(false);
});

test("X's title can differ from the page's, and falls back to it", () => {
  const card = { path: "/cartao/placar.png", model: homeCard(d, today) };
  const get = (tags: ReturnType<typeof ogTags>, k: string) => tags.find((t) => ("property" in t ? t.property : t.name) === k)?.content;
  const own = ogTags({ title: "Abre o Voto", description: "d", canonical: null, card, siteX: null, xTitle: "Clique e cobre o seu senador" });
  expect(get(own, "twitter:title")).toBe("Clique e cobre o seu senador");
  expect(get(own, "og:title")).toBe("Abre o Voto");
  expect(get(ogTags({ title: "Abre o Voto", description: "d", canonical: null, card, siteX: null }), "twitter:title")).toBe("Abre o Voto");
});
