/**
 * How the Instagram action delivers the card. The system share sheet reaches Instagram
 * only on a phone; a desktop browser may share files too (Chrome on macOS does), but its
 * sheet has no Instagram, so there the card is downloaded.
 */
export function instagramMode(env: { touch: boolean; canShareFiles: boolean }): "share" | "download" {
  return env.touch && env.canShareFiles ? "share" : "download";
}
