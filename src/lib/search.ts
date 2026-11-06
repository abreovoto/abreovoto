/** The list filter: pure, so the page script and the tests share it. */

export type ListRow = {
  nome: string;
  status: "nao_declarou" | "declarou" | "mostrou_na_sessao";
  candidato: string | null;
  uf: string;
  partido: string;
};

export type ListFilter = {
  status: "todos" | "nao_declarou" | "declarou";
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
  if (f.status === "nao_declarou" && row.status !== "nao_declarou") return false;
  if (f.status === "declarou" && row.status === "nao_declarou") return false;
  if (f.uf && row.uf !== f.uf) return false;
  if (f.partido && row.partido !== f.partido) return false;
  const q = normalizeName(f.q);
  return q === "" || normalizeName(row.nome).includes(q);
}
