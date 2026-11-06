/**
 * Design tokens: the one place the site's colours and typefaces are written in code.
 * `global.css` mirrors these values into Tailwind's theme; a test keeps the two equal.
 */

export type Mode = "light" | "dark";

export type Palette = {
  bg: string;
  surface: string;
  fg: string;
  fgMuted: string;
  line: string;
  undeclared: string;
  declared: string;
  accent: string;
  onAccent: string;
  focus: string;
};

/** Paper and ink: a white page with navy ink; dark mode is its negative. */
export const palette: Record<Mode, Palette> = {
  light: {
    bg: "#ffffff",
    surface: "#eef0ea",
    fg: "#12284b",
    fgMuted: "#4f5b72",
    line: "#c9cfd9",
    undeclared: "#b8291f",
    declared: "#17753a",
    accent: "#1d4fd7",
    onAccent: "#ffffff",
    focus: "#1d4fd7",
  },
  dark: {
    bg: "#0e1a33",
    surface: "#182845",
    fg: "#f2f3ee",
    fgMuted: "#aab4c7",
    line: "#30415f",
    undeclared: "#ff9486",
    declared: "#55cc82",
    accent: "#8fb0ff",
    onAccent: "#0e1a33",
    focus: "#8fb0ff",
  },
};

/**
 * One family, two widths: the display role is Archivo expanded (`font-stretch: 125%`,
 * weight 800); the text role is Archivo at its normal width.
 */
export const fonts = {
  display: '"Archivo Variable", "Archivo", Arial, sans-serif',
  text: '"Archivo Variable", "Archivo", Arial, sans-serif',
};

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}
