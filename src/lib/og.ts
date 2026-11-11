/**
 * The Open Graph and Twitter tags every page carries: the page's title and description,
 * and the card that represents it when its link is shared.
 */
import { absolute } from "./routes";
import { cardAlt, cardVersion, type ShareCardModel } from "./share-card";
import { profileHandle } from "./text";

export type Card = { path: string; model: ShareCardModel };

export type MetaTag = { property: string; content: string } | { name: string; content: string };

export function ogTags(args: {
  title: string;
  description: string;
  canonical: string | null;
  card: Card;
  siteX: string | null;
  /** The title X shows, laid over the bottom-left corner of the card; the page's title when absent. */
  xTitle?: string;
}): MetaTag[] {
  const { title, description, canonical, card, siteX, xTitle = title } = args;
  // The version changes with what the card shows, so networks fetch the new image.
  const image = `${absolute(card.path)}?v=${cardVersion(card.model)}`;
  const og = (property: string, content: string): MetaTag => ({ property, content });
  const tw = (name: string, content: string): MetaTag => ({ name, content });
  return [
    og("og:type", "website"),
    og("og:site_name", "Abre o Voto"),
    og("og:locale", "pt_BR"),
    ...(canonical ? [og("og:url", canonical)] : []),
    og("og:title", title),
    og("og:description", description),
    og("og:image", image),
    og("og:image:width", "1200"),
    og("og:image:height", "630"),
    og("og:image:type", "image/png"),
    og("og:image:alt", cardAlt(card.model)),
    tw("twitter:card", "summary_large_image"),
    ...(siteX ? [tw("twitter:site", profileHandle(siteX))] : []),
    tw("twitter:title", xTitle),
    tw("twitter:description", description),
    tw("twitter:image", image),
  ];
}
