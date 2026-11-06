/**
 * The Senate's 81 seats as a hemicycle: four concentric arcs in a 300 × 158 box,
 * centred on (150, 150). Pure geometry, rendered once at build time.
 */

/** Seats per arc, inner row first. */
export const ROWS = [15, 19, 22, 25] as const;

const RADII = [62, 86, 110, 134] as const;
const CX = 150;
const CY = 150;

export type Seat = { x: number; y: number };

/** The 81 seats, inner row first; each row spread evenly from 180° (left) to 0° (right). */
export function seats(): Seat[] {
  return ROWS.flatMap((n, row) =>
    Array.from({ length: n }, (_, k) => {
      const angle = Math.PI - (Math.PI * k) / (n - 1);
      return { x: CX + RADII[row]! * Math.cos(angle), y: CY - RADII[row]! * Math.sin(angle) };
    }),
  );
}

/**
 * Seat indices in the order declared seats take them: by angular distance from the
 * top of the arc (90°), ties by row, inner first — so the filled seats grow from the
 * centre outward and neither side of the chamber reads as a side.
 */
export function fillOrder(): number[] {
  const rowOf = ROWS.flatMap((n, row) => Array.from({ length: n }, () => row));
  const key = seats().map((s, i) => ({ i, d: Math.abs(Math.atan2(CY - s.y, s.x - CX) - Math.PI / 2), row: rowOf[i]! }));
  return key.sort((a, b) => a.d - b.d || a.row - b.row).map((k) => k.i);
}
