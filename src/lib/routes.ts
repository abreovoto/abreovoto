import type { UF } from "../data/schema";

export const SITE_URL = "https://abreovoto.com";

export const senatorPath = (id: string): string => `/senador/${id}/`;

export const statePath = (uf: UF): string => `/estado/${uf.toLowerCase()}/`;

export const candidatePath = (id: string): string => `/candidato/${id}/`;

/** The senator's official profile on the Senate's site. */
export const senateProfileUrl = (codigo: string): string =>
  `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${codigo}`;

export const absolute = (path: string, site: string = SITE_URL): string => new URL(path, site).toString();

/** Share card images: no trailing slash, they are files. */
export const senatorCardPath = (id: string): string => `/cartao/senador/${id}.png`;

export const candidateCardPath = (id: string): string => `/cartao/candidato/${id}.png`;

export const HOME_CARD_PATH = "/cartao/placar.png";
