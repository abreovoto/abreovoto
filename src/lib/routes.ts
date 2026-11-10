import type { UF } from "../data/schema";
import { PRODUCTION_URL } from "./preview";

/**
 * The origin of the build, from the site configured for it: abreovoto.com, or a preview's own
 * address. Outside a build (tests, scripts), abreovoto.com.
 */
export const SITE_URL: string = (import.meta.env?.SITE as string | undefined)?.replace(/\/$/, "") ?? PRODUCTION_URL;

/** A preview build: its pages stay out of search engines. */
export const IS_PREVIEW = SITE_URL !== PRODUCTION_URL;

export const senatorPath = (id: string): string => `/senador/${id}/`;

export const statePath = (uf: UF): string => `/estado/${uf.toLowerCase()}/`;

export const candidatePath = (id: string): string => `/candidato/${id}/`;

/** The senator's official profile on the Senate's site. */
export const senateProfileUrl = (codigo: string): string =>
  `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${codigo}`;

export const absolute = (path: string, site: string = SITE_URL): string => new URL(path, site).toString();

/**
 * A site address moved to the origin the visitor is on: the same path and query on a preview
 * as on abreovoto.com, so a link copied there opens there.
 */
export const onOrigin = (url: string, origin: string): string => {
  const u = new URL(url);
  return new URL(u.pathname + u.search + u.hash, origin).toString();
};

/** Share card images: no trailing slash, they are files. */
export const senatorCardPath = (id: string): string => `/cartao/senador/${id}.png`;

export const candidateCardPath = (id: string): string => `/cartao/candidato/${id}.png`;

export const HOME_CARD_PATH = "/cartao/placar.png";
