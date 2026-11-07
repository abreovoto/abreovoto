/**
 * How the Instagram action delivers the card. The system share sheet reaches Instagram
 * only on a phone; a desktop browser may share files too (Chrome on macOS does), but its
 * sheet has no Instagram, so there the card is downloaded.
 */
export function instagramMode(env: { touch: boolean; canShareFiles: boolean }): "share" | "download" {
  return env.touch && env.canShareFiles ? "share" : "download";
}

/** How the card reached the visitor: through the share sheet, as a download, not at all. */
export type Delivery = "shared" | "downloaded" | "cancelled" | "failed";

/**
 * The status line after the Instagram action. Copying the text and delivering the card
 * are independent: a failed copy still delivers the card, and the line says which half
 * failed. Null when there is nothing to say (the person closed the share sheet).
 */
export function instagramStatus(copied: boolean, delivery: Delivery): string | null {
  if (delivery === "failed") return "Não foi possível compartilhar. Baixe o cartão e copie o link.";
  if (copied) {
    if (delivery === "shared") return "Texto copiado. Cole no Instagram.";
    if (delivery === "downloaded") return "Texto copiado e cartão baixado. Cole no Instagram.";
    return null;
  }
  return delivery === "downloaded" ? "Cartão baixado. Não foi possível copiar o texto." : "Não foi possível copiar o texto.";
}
