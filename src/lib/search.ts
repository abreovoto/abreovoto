/** The list filter: pure, so the page script and the tests share it. */
import type { Nivel } from "../data/posicao";

export type ListRow = {
  nome: string;
  /** The level in effect (`posicao().nivel`). */
  status: Nivel;
  candidato: string | null;
  uf: string;
  partido: string;
};

export type ListFilter = {
  status: "todos" | "nao_declarou" | "declarou" | "apoio_mapeado" | "partido";
  uf: string;
  partido: string;
  q: string;
};

/** "  José   Serra " → "jose serra": no accents, lowercase, single spaces. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Every filter must hold; an empty one holds for everyone. A ballot shown in the session counts as declared. */
export function matches(row: ListRow, f: ListFilter): boolean {
  const level = row.status === "mostrou_na_sessao" ? "declarou" : row.status;
  if (f.status !== "todos" && level !== f.status) return false;
  if (f.uf && row.uf !== f.uf) return false;
  if (f.partido && row.partido !== f.partido) return false;
  const q = normalizeName(f.q);
  return q === "" || normalizeName(row.nome).includes(q);
}
