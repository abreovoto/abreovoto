/** How the card reached the visitor: through the share sheet, as a download, not at all. */
export type Delivery = "shared" | "downloaded" | "cancelled" | "failed";

/**
 * The status line after "Compartilhar cartão". The share sheet speaks for itself, opened or
 * closed; the line only speaks when the sheet was refused and the card was downloaded instead,
 * or when nothing worked. Null when there is nothing to say.
 */
export function shareStatus(delivery: Delivery): string | null {
  if (delivery === "downloaded") return "Cartão baixado.";
  if (delivery === "failed") return "Não foi possível compartilhar. Baixe o cartão e copie o link.";
  return null;
}
