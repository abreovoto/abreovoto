/**
 * The portrait rule: one rendered size per context, the same for every senator,
 * and no source ever requested above its own width.
 */

/**
 * Rendered width in CSS px per context; `share` is the width inside the 1200×630 card of a
 * senator or candidate, `homeShare` each candidate's face on the home card.
 */
export const PORTRAIT_SIZES = { list: 56, state: 80, page: 96, homeShare: 136, share: 160 } as const;

/** Width / height. The TSE's 161×225 rounded; every source is cropped to it. */
export const PORTRAIT_RATIO = 4 / 5;

export type PortraitSize = keyof typeof PORTRAIT_SIZES;

/** Height in CSS px for a context, from its width and the ratio. */
export function portraitHeight(size: PortraitSize): number {
  return Math.round(PORTRAIT_SIZES[size] / PORTRAIT_RATIO);
}

/** The 1× and 2× widths to request, dropping any above the source; never empty. */
export function requestedWidths(size: PortraitSize, sourceWidth: number): number[] {
  const base = PORTRAIT_SIZES[size];
  const widths = [base, 2 * base].filter((w) => w <= sourceWidth);
  return widths.length > 0 ? widths : [sourceWidth];
}

/** Ids whose source is narrower than 2× the context, i.e. not sharp on a high-density screen. */
export function undersized(photos: { id: string; width: number }[], size: PortraitSize): string[] {
  return photos.filter((p) => p.width < 2 * PORTRAIT_SIZES[size]).map((p) => p.id);
}
