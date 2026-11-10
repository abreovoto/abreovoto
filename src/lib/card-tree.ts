/**
 * The 1200×630 share card as a satori element tree: the one place the card's
 * composition lives. Light mode only; flexbox only, as satori requires.
 */
import { PORTRAIT_SIZES, portraitHeight } from "./portrait";
import type { CardScoreboard, ShareCardModel } from "./share-card";
import { palette } from "../styles/tokens";

export type CardNode = {
  type: string;
  props: Record<string, unknown> & {
    style?: Record<string, string | number>;
    children?: CardNode | CardNode[] | string;
  };
};

type Style = Record<string, string | number>;

const el = (type: string, style: Style, children?: CardNode | CardNode[] | string, extra: Record<string, unknown> = {}): CardNode => ({
  type,
  props: { ...extra, style, ...(children === undefined ? {} : { children }) },
});

const p = palette.light;
const display: Style = { fontFamily: "Display", fontWeight: 800 };
const text: Style = { fontFamily: "Text", fontWeight: 400 };

function statusColour(status: string): string {
  if (status === "não declarou") return p.undeclared;
  if (/^(declarou|mostrou)/.test(status)) return p.declared;
  if (/^apoio (mapeado|pelo partido|pela federação) a /.test(status)) return p.mappedText;
  return p.fgMuted; // the departure note
}

function mark(size: number): CardNode {
  return el(
    "svg",
    { width: size, height: size, flexShrink: 0 },
    el("path", {}, undefined, { d: "M54.1 18.3A26 26 0 1 1 45.7 9.9", fill: "none", stroke: p.fg, strokeWidth: 12 }),
    { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 64 64" },
  );
}

function wordmark(markSize: number, fontSize: number): CardNode {
  return el("div", { display: "flex", alignItems: "center", gap: 12 }, [
    mark(markSize),
    el("div", { ...display, fontSize, letterSpacing: "-0.02em" }, "Abre o Voto"),
  ]);
}

function footer(left: string, right: string, fontSize: number): CardNode {
  return el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", ...text, fontWeight: 600, fontSize, color: p.fgMuted }, [
    el("div", {}, left),
    el("div", {}, right),
  ]);
}

/** The card's frame. Satori has no box-sizing: the content box plus the padding is the 1200×630 card. */
function frame(children: CardNode[]): CardNode {
  return el(
    "div",
    { display: "flex", flexDirection: "column", justifyContent: "space-between", width: 1200 - 2 * 56, height: 630 - 2 * 56, padding: 56, background: p.bg, color: p.fg, ...text },
    children,
  );
}

function titleBlock(m: ShareCardModel): CardNode {
  const children: CardNode[] = [
    el("div", { ...display, fontSize: 72, lineHeight: 1.05, letterSpacing: "-0.02em" }, m.title),
    el("div", { ...text, fontSize: 36, lineHeight: 1.2, color: p.fgMuted, marginTop: 8 }, m.subtitle),
  ];
  if (m.status) {
    const c = statusColour(m.status);
    children.push(
      el("div", { display: "flex", alignItems: "center", gap: 16, marginTop: 28, ...display, fontSize: 48, lineHeight: 1, color: c }, [
        el("div", { width: 22, height: 22, flexShrink: 0, background: c }),
        el("div", {}, m.status),
      ]),
    );
  }
  return el("div", { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }, children);
}

function numberBlock(m: ShareCardModel): CardNode {
  return el("div", { display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }, [
    el("div", { ...display, fontSize: 200, lineHeight: 1, color: p.fg }, String(m.number)),
    el("div", { ...text, fontSize: 32, lineHeight: 1.2, color: p.fgMuted }, m.numberLabel ?? ""),
  ]);
}

/** The home card's face size, and the widest row it lays out at full size. */
export const HOME_FACE = { width: PORTRAIT_SIZES.homeShare, height: portraitHeight("homeShare") };
const HOME_FULL_SIZE_CANDIDATES = 3;

/**
 * The scoreboard row: one column per candidate, every column the same width, every face the same
 * size and every total in the same type, whatever the count; then who has no known position.
 * Past three candidates the whole row scales down together, so no candidate is ever drawn
 * smaller than another.
 */
function scoreboardRow(b: CardScoreboard, faces: Record<string, string>): CardNode {
  const k = Math.min(1, HOME_FULL_SIZE_CANDIDATES / b.candidates.length);
  const fw = Math.round(HOME_FACE.width * k);
  const fh = Math.round(HOME_FACE.height * k);
  const numeral: Style = { ...display, fontSize: Math.round(88 * k), lineHeight: 1 };
  const label: Style = { ...text, fontWeight: 600, fontSize: Math.round(22 * k), lineHeight: 1.2, marginTop: 6 };
  const note: Style = { ...text, fontSize: Math.round(20 * k), lineHeight: 1.2, color: p.fgMuted };
  const columns = b.candidates.map((c) => {
    const face = faces[c.id];
    if (face === undefined) throw new Error(`home card: no face for ${c.id}`);
    return el("div", { display: "flex", alignItems: "center", gap: Math.round(16 * k), width: Math.round(262 * k), flexShrink: 0 }, [
      el("img", { width: fw, height: fh, objectFit: "cover", objectPosition: "top", borderRadius: 6, background: p.surface, flexShrink: 0 }, undefined, {
        src: face,
        width: fw,
        height: fh,
      }),
      el("div", { display: "flex", flexDirection: "column", minWidth: 0 }, [
        el("div", { ...numeral, color: p.fg }, String(c.total)),
        el("div", { ...label, color: p.fg }, c.name),
        el("div", note, c.partyState),
      ]),
    ]);
  });
  const noPosition = el("div", { display: "flex", flexDirection: "column", paddingLeft: Math.round(28 * k), borderLeft: `3px solid ${p.line}`, flexShrink: 0 }, [
    el("div", { ...numeral, color: p.undeclared }, String(b.noPosition)),
    el("div", { ...label, color: p.undeclared }, "sem posição"),
    el("div", note, `de ${b.senators} senadores`),
  ]);
  return el("div", { display: "flex", justifyContent: "space-between", alignItems: "center" }, [...columns, noPosition]);
}

/** The campaign line, one sentence per line, the answer in the accent colour, as on the petition. */
function campaignLine(title: string): CardNode {
  return el(
    "div",
    { display: "flex", flexDirection: "column" },
    title.split(/(?<=\.) /).map((line, i) => el("div", { ...display, fontSize: 56, lineHeight: 1.08, letterSpacing: "-0.02em", color: i === 0 ? p.fg : p.accent }, line)),
  );
}

/**
 * `portrait` is a data URI (or any URL satori can read), or null for a card without one.
 * `faces` holds the home card's candidate portraits, by candidate id, sized `HOME_FACE`.
 */
export function cardTree(m: ShareCardModel, portrait: string | null, faces: Record<string, string> = {}): CardNode {
  if (m.kind === "home") {
    return frame([
      wordmark(40, 34),
      campaignLine(m.title),
      scoreboardRow(m.scoreboard!, faces),
      footer(m.hashtag, `Placar em ${m.date} · ${m.domain}`, 28),
    ]);
  }

  const w = PORTRAIT_SIZES.share;
  const h = portraitHeight("share");
  const middle: CardNode[] = [];
  if (portrait !== null) {
    middle.push(
      el("img", { width: w, height: h, objectFit: "cover", objectPosition: "top", borderRadius: 6, background: p.surface, flexShrink: 0 }, undefined, {
        src: portrait,
        width: w,
        height: h,
      }),
    );
  }
  middle.push(titleBlock(m));
  if (m.number !== null) middle.push(numberBlock(m));

  return frame([
    wordmark(48, 40),
    el("div", { display: "flex", alignItems: "center", gap: 40 }, middle),
    footer(m.hashtag, `${m.date} · ${m.domain}`, 32),
  ]);
}
