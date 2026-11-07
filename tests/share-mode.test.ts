import { expect, test } from "vitest";
import { shareStatus } from "../src/lib/share-mode";

test("the share sheet needs no line when it opened or was closed; a fallback or a failure says what happened", () => {
  expect(shareStatus("shared")).toBeNull();
  expect(shareStatus("cancelled")).toBeNull();
  expect(shareStatus("downloaded")).toBe("Cartão baixado.");
  expect(shareStatus("failed")).toBe("Não foi possível compartilhar. Baixe o cartão e copie o link.");
});
