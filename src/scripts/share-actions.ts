// The two share actions that need a script: Instagram (copy the text, then share or
// download the card) and copy link. Every text comes from the button's data attributes.

import { instagramMode } from "../lib/share-mode";

const announce = (el: Element, text: string): void => {
  const line = el.closest("[data-share-actions]")?.querySelector<HTMLElement>("[data-share-status]");
  if (line) line.textContent = text;
};

// The card is fetched as soon as the finger lands, so the click's path to `share()` stays
// short: a share sheet needs the user's gesture, which a slow fetch can outlive.
const prefetched = new WeakMap<HTMLElement, Promise<Blob>>();
const cardBlob = (button: HTMLElement): Promise<Blob> => {
  let blob = prefetched.get(button);
  if (!blob) {
    blob = fetch(button.dataset.card!).then((r) => {
      if (!r.ok) throw new Error(`card ${r.status}`);
      return r.blob();
    });
    prefetched.set(button, blob);
  }
  return blob;
};

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

for (const button of document.querySelectorAll<HTMLElement>("[data-share-instagram]")) {
  button.addEventListener("pointerdown", () => void cardBlob(button).catch(() => prefetched.delete(button)), { passive: true });
  button.addEventListener("click", async () => {
    const { text, file: name } = button.dataset;
    try {
      await navigator.clipboard.writeText(text!);
      const file = new File([await cardBlob(button)], name!, { type: "image/png" });
      const touch = matchMedia("(pointer: coarse)").matches;
      if (instagramMode({ touch, canShareFiles: navigator.canShare?.({ files: [file] }) ?? false }) === "share") {
        try {
          await navigator.share({ files: [file] });
          announce(button, "Texto copiado. Cole no Instagram.");
          return;
        } catch (e) {
          // The person closed the share sheet: nothing to say.
          if (e instanceof DOMException && e.name === "AbortError") return;
          // Refused (e.g. the gesture expired while the card loaded): the download still works.
        }
      }
      download(file, name!);
      announce(button, "Texto copiado e cartão baixado. Cole no Instagram.");
    } catch {
      prefetched.delete(button);
      announce(button, "Não foi possível compartilhar. Baixe o cartão e copie o link.");
    }
  });
}

for (const button of document.querySelectorAll<HTMLElement>("[data-copy-link]")) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.url!);
      announce(button, "Link copiado.");
    } catch {
      announce(button, "Não foi possível copiar o link.");
    }
  });
}
