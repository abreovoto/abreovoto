// The two share actions that need a script: share the card (the system share sheet, with the
// card and the text) and copy link, or a ready-made post carrying the link when the button has one. The texts come from the button's data attributes.

import { onOrigin, textOnOrigin } from "../lib/routes";
import { shareStatus, type Delivery } from "../lib/share-mode";

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

for (const button of document.querySelectorAll<HTMLElement>("[data-share-card]")) {
  button.addEventListener("pointerdown", () => void cardBlob(button).catch(() => prefetched.delete(button)), { passive: true });
  button.addEventListener("click", async () => {
    const delivery = await deliver(button);
    if (delivery === "failed") prefetched.delete(button);
    const status = shareStatus(delivery);
    if (status) announce(button, status);
  });
}

// The button only shows where the share sheet takes files on a touch screen (the "share"
// class, set before paint), so the sheet is the path; the download is the fallback.
async function deliver(button: HTMLElement): Promise<Delivery> {
  const { text, file: name } = button.dataset;
  try {
    const file = new File([await cardBlob(button)], name!, { type: "image/png" });
    try {
      await navigator.share({ files: [file], text: text! });
      return "shared";
    } catch (e) {
      // The person closed the share sheet.
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Refused (e.g. the gesture expired while the card loaded): the download still works.
    }
    download(file, name!);
    return "downloaded";
  } catch {
    return "failed";
  }
}

for (const button of document.querySelectorAll<HTMLElement>("[data-copy-link]")) {
  button.addEventListener("click", async () => {
    const { url, text } = button.dataset;
    try {
      await navigator.clipboard.writeText(text ? textOnOrigin(text, url!, location.origin) : onOrigin(url!, location.origin));
      announce(button, text ? "Texto copiado." : "Link copiado.");
      // For a button whose label shows the outcome instead of a status line.
      button.dataset.copied = "";
      setTimeout(() => delete button.dataset.copied, 2000);
    } catch {
      announce(button, text ? "Não foi possível copiar o texto." : "Não foi possível copiar o link.");
    }
  });
}
