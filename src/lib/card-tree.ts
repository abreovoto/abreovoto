/**
 * The 1200×630 share card as a satori element tree: the one place the card's
 * composition lives. Light mode only; flexbox only, as satori requires.
 */
import { PORTRAIT_SIZES, portraitHeight } from "./portrait";
import type { CardScoreboard, ShareCardModel } from "./share-card";
import { palette } from "../styles/tokens";

/**
 * The composition's revision, part of every card's version: raise it whenever a change here
 * alters what a card looks like for the same data, so its image gets a new address and no
 * network keeps showing the old drawing under it.
 */
export const CARD_LAYOUT = 3;

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

/** The highlighter colour of the call to action: the one hue that means nothing on the scoreboard. */
const CTA_FILL = "#ffd23f";

/** A pointing-hand cursor, the universal sign that something is a link. */
function pointer(size: number): CardNode {
  const stroke = { fill: "none", stroke: p.fg, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  return el(
    "svg",
    { width: size, height: size, flexShrink: 0 },
    [
      el("path", {}, undefined, {
        d: "M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15V4a2 2 0 0 1 4 0v5a2 2 0 0 1 4 0v1a2 2 0 0 1 3 1z",
        ...stroke,
        fill: p.bg,
      }),
      el("path", {}, undefined, { d: "M11 9v3M15 10v2M18 11v1", ...stroke }),
    ],
    { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24" },
  );
}

/** The "share" glyph: three linked nodes. */
function shareIcon(size: number): CardNode {
  const stroke = { fill: "none", stroke: p.fg, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };
  return el(
    "svg",
    { width: size, height: size, flexShrink: 0 },
    [
      el("circle", {}, undefined, { cx: 18, cy: 5, r: 3, ...stroke, fill: CTA_FILL }),
      el("circle", {}, undefined, { cx: 6, cy: 12, r: 3, ...stroke, fill: CTA_FILL }),
      el("circle", {}, undefined, { cx: 18, cy: 19, r: 3, ...stroke, fill: CTA_FILL }),
      el("path", {}, undefined, { d: "M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98", ...stroke }),
    ],
    { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24" },
  );
}

/** The height of the call-to-action button, so the share prompt beside it centres on the button and not on the caption below. */
const CTA_HEIGHT = 62;

/**
 * The home card's bottom row: the invitation to share, then the button that sends the reader to the
 * site. A shared preview reads as a still picture, so the button says to click and a pointer presses it.
 * The share prompt sits high in its row: X lays a label over the image's bottom-left corner.
 */
function callToAction(m: ShareCardModel): CardNode {
  const button = el(
    "div",
    { display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: CTA_FILL, borderRadius: 14, padding: "16px 26px", ...display, fontSize: 27, letterSpacing: "-0.01em", color: p.fg },
    [el("div", {}, "CLIQUE E COBRE O SEU SENADOR"), el("div", {}, "→")],
  );
  return el("div", { display: "flex", alignItems: "center", gap: 20 }, [
    el("div", { display: "flex", alignItems: "center", alignSelf: "flex-start", height: CTA_HEIGHT, marginTop: -14, gap: 12, marginRight: "auto", flexShrink: 0 }, [
      shareIcon(36),
      el("div", { display: "flex", flexDirection: "column" }, [
        el("div", { ...display, fontSize: 26, lineHeight: 1.1, color: p.fg }, "COMPARTILHE!"),
        el("div", { ...text, fontWeight: 600, fontSize: 20, lineHeight: 1.2, color: p.fgMuted }, "O placar muda todo dia."),
      ]),
    ]),
    el("div", { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, position: "relative" }, [
      button,
      el("div", { ...text, fontWeight: 600, fontSize: 20, color: p.fgMuted }, `${m.domain} · placar em ${m.date}`),
      el("div", { display: "flex", position: "absolute", right: -14, top: 34 }, pointer(56)),
    ]),
  ]);
}

/**
 * `portrait` is a data URI (or any URL satori can read), or null for a card without one.
 * `faces` holds the home card's candidate portraits, by candidate id, sized `HOME_FACE`.
 */
export function cardTree(m: ShareCardModel, portrait: string | null, faces: Record<string, string> = {}): CardNode {
  if (m.kind === "home") {
    return frame([
      // The question the button below answers, and the campaign's hashtag.
      el("div", { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, [
        wordmark(40, 34),
        el("div", { display: "flex", flexDirection: "column", alignItems: "flex-end" }, [
          el("div", { ...display, fontSize: 26, lineHeight: 1.1, color: p.fg }, "O seu senador já abriu o voto?"),
          el("div", { ...text, fontWeight: 600, fontSize: 22, lineHeight: 1.3, color: p.fgMuted }, m.hashtag),
        ]),
      ]),
      campaignLine(m.title),
      scoreboardRow(m.scoreboard!, faces),
      callToAction(m),
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
