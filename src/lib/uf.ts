import type { UF } from "../data/schema";

/** Official names of the 26 states and the Federal District. */
export const UF_NAMES: Record<UF, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const ufName = (uf: UF): string => UF_NAMES[uf];

/** States whose name takes the article: "do Ceará", "da Bahia". The others take a bare "de". */
const ARTICLE: Partial<Record<UF, "do" | "da">> = {
  AC: "do",
  AP: "do",
  AM: "do",
  BA: "da",
  CE: "do",
  DF: "do",
  ES: "do",
  MA: "do",
  PA: "do",
  PB: "da",
  PR: "do",
  PI: "do",
  RJ: "do",
  RN: "do",
  RS: "do",
  TO: "do",
};

/** "de São Paulo", "do Rio Grande do Norte", "da Bahia". */
export const ufWithDe = (uf: UF): string => `${ARTICLE[uf] ?? "de"} ${UF_NAMES[uf]}`;
