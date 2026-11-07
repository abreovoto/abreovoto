import { expect, test } from "vitest";
import { instagramMode } from "../src/lib/share-mode";

test("the share sheet only on a touch screen that shares files; the download everywhere else", () => {
  expect(instagramMode({ touch: true, canShareFiles: true })).toBe("share");
  expect(instagramMode({ touch: true, canShareFiles: false })).toBe("download");
  // A desktop browser may share files too (Chrome on macOS does), but its sheet has no Instagram.
  expect(instagramMode({ touch: false, canShareFiles: true })).toBe("download");
  expect(instagramMode({ touch: false, canShareFiles: false })).toBe("download");
});
