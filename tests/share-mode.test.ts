import { expect, test } from "vitest";
import { instagramMode, instagramStatus } from "../src/lib/share-mode";

test("the share sheet only on a touch screen that shares files; the download everywhere else", () => {
  expect(instagramMode({ touch: true, canShareFiles: true })).toBe("share");
  expect(instagramMode({ touch: true, canShareFiles: false })).toBe("download");
  // A desktop browser may share files too (Chrome on macOS does), but its sheet has no Instagram.
  expect(instagramMode({ touch: false, canShareFiles: true })).toBe("download");
  expect(instagramMode({ touch: false, canShareFiles: false })).toBe("download");
});

test("the card still reaches the visitor when the text could not be copied, and the line says which half failed", () => {
  expect(instagramStatus(true, "shared")).toBe("Texto copiado. Cole no Instagram.");
  expect(instagramStatus(true, "downloaded")).toBe("Texto copiado e cartão baixado. Cole no Instagram.");
  expect(instagramStatus(true, "cancelled")).toBeNull();
  expect(instagramStatus(false, "shared")).toBe("Não foi possível copiar o texto.");
  expect(instagramStatus(false, "downloaded")).toBe("Cartão baixado. Não foi possível copiar o texto.");
  expect(instagramStatus(false, "cancelled")).toBe("Não foi possível copiar o texto.");
  for (const copied of [true, false]) {
    expect(instagramStatus(copied, "failed")).toBe("Não foi possível compartilhar. Baixe o cartão e copie o link.");
  }
});
