/**
 * The 1200×630 share card as a satori element tree: the one place the card's
 * composition lives. Light mode only; flexbox only, as satori requires.
 */
import { PORTRAIT_SIZES, portraitHeight } from "./portrait";
import type { ShareCardModel } from "./share-card";
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
  return p.fgMuted; // the departure note
}

function mark(): CardNode {
  return el(
    "svg",
    { width: 48, height: 48, flexShrink: 0 },
    el("path", {}, undefined, { d: "M54.1 18.3A26 26 0 1 1 45.7 9.9", fill: "none", stroke: p.fg, strokeWidth: 12 }),
    { xmlns: "http://www.w3.org/2000/svg", width: 48, height: 48, viewBox: "0 0 64 64" },
  );
}

function titleBlock(m: ShareCardModel): CardNode {
  const children: CardNode[] = [
    ...(m.kind === "home"
      ? // The campaign line: one sentence per line, the answer in the accent colour, as on the petition.
        m.title.split(/(?<=\.) /).map((line, i) =>
          el("div", { ...display, fontSize: 64, lineHeight: 1.1, letterSpacing: "-0.02em", color: i === 0 ? p.fg : p.accent }, line),
        )
      : [el("div", { ...display, fontSize: 72, lineHeight: 1.05, letterSpacing: "-0.02em" }, m.title)]),
    el("div", { ...text, fontSize: 36, lineHeight: 1.2, color: p.fgMuted, marginTop: m.kind === "home" ? 20 : 8 }, m.subtitle),
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
    el("div", { ...display, fontSize: 200, lineHeight: 1, color: m.kind === "home" ? p.undeclared : p.fg }, String(m.number)),
    el("div", { ...text, fontSize: 32, lineHeight: 1.2, color: p.fgMuted }, m.numberLabel ?? ""),
  ]);
}

/** `portrait` is a data URI (or any URL satori can read), or null for a card without one. */
export function cardTree(m: ShareCardModel, portrait: string | null): CardNode {
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

  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      // Satori has no box-sizing: the content box plus the padding is the 1200×630 card.
      width: 1200 - 2 * 56,
      height: 630 - 2 * 56,
      padding: 56,
      background: p.bg,
      color: p.fg,
      ...text,
    },
    [
      el("div", { display: "flex", alignItems: "center", gap: 12 }, [
        mark(),
        el("div", { ...display, fontSize: 40, letterSpacing: "-0.02em" }, "Abre o Voto"),
      ]),
      el("div", { display: "flex", alignItems: "center", gap: 40 }, middle),
      el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", ...text, fontWeight: 600, fontSize: 32, color: p.fgMuted }, [
        el("div", {}, m.hashtag),
        el("div", {}, m.date === null ? m.domain : `${m.date} · ${m.domain}`),
      ]),
    ],
  );
}
