// The source form's client: loads Turnstile only when the visitor reaches the form, posts with
// fetch, and swaps the section for the receipt or says what to do. Every sentence comes from the
// section's data-text; this module holds none of its own.

import { mailtoFor, protocolText } from "../lib/source-form";

type Texts = {
  verifying: string;
  receivedSenator: string;
  receivedSite: string;
  transient: string;
  definitive: string;
  field: Record<"url" | "comentario" | "senador", string>;
  submit: string;
};

type TurnstileOptions = {
  sitekey: string;
  size: "flexible";
  language: string;
  appearance: "interaction-only";
  theme: "light" | "dark" | "auto";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};
type Turnstile = { render(el: HTMLElement, opts: TurnstileOptions): string; reset(id: string): void };

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loader: Promise<Turnstile> | null = null;
function loadTurnstile(): Promise<Turnstile> {
  loader ??= new Promise<Turnstile>((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src: TURNSTILE_SRC, async: true, defer: true });
    s.addEventListener("load", () => {
      const t = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (t) resolve(t);
      else reject(new Error("turnstile"));
    });
    s.addEventListener("error", () => {
      s.remove();
      reject(new Error("turnstile"));
    });
    document.head.append(s);
  }).catch((e: unknown) => {
    loader = null;
    throw e;
  });
  return loader;
}

const theme = (): "light" | "dark" | "auto" => {
  const t = document.documentElement.dataset.theme;
  return t === "dark" ? "dark" : t === "light" ? "light" : "auto";
};

function setup(section: HTMLElement): void {
  const form = section.querySelector("form");
  const body = section.querySelector<HTMLElement>("[data-form-body]");
  const button = section.querySelector<HTMLButtonElement>("[data-source-submit]");
  const status = section.querySelector<HTMLElement>("[data-form-status]");
  const container = section.querySelector<HTMLElement>("[data-turnstile]");
  if (!form || !body || !button || !status || !container) return;
  const text = JSON.parse(section.dataset.text ?? "{}") as Texts;
  const contato = section.dataset.contato ?? "";
  const sitekey = section.dataset.sitekey ?? "";

  let turnstile: Turnstile | null = null;
  let widget: string | null = null;
  let token: string | null = null;
  let waiting = false;
  let sending = false;
  let refusals = 0;

  const busy = (on: boolean, label = text.submit) => {
    button.disabled = on;
    button.textContent = label;
  };

  const fresh = () => {
    token = null;
    if (turnstile && widget !== null) turnstile.reset(widget);
  };

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    loadTurnstile()
      .then((t) => {
        turnstile = t;
        widget = t.render(container, {
          sitekey,
          size: "flexible",
          language: "pt-BR",
          appearance: "interaction-only",
          theme: theme(),
          callback: (t) => {
            token = t;
            if (waiting) {
              waiting = false;
              void send();
            }
          },
          "expired-callback": fresh,
          "error-callback": () => {
            token = null;
            if (waiting) {
              waiting = false;
              say(text.transient);
            }
          },
        });
      })
      .catch(() => {
        started = false;
        if (waiting) {
          waiting = false;
          say(text.transient);
        }
      });
  };

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      start();
    }
  });
  observer.observe(section);
  form.addEventListener("focusin", start, { once: true });

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;

  const clearErrors = () => {
    status.textContent = "";
    for (const p of form.querySelectorAll<HTMLElement>("[data-field-error]")) p.textContent = "";
    for (const c of form.querySelectorAll("[aria-invalid]")) c.removeAttribute("aria-invalid");
  };

  /** A failure the visitor can retry: the fields keep their values, the next try has a fresh token. */
  function say(line: string): void {
    status!.textContent = line;
    busy(false);
  }

  function fieldError(campo: keyof Texts["field"]): void {
    const control = field(campo);
    const line = form!.querySelector<HTMLElement>(`[data-field-error="${campo}"]`);
    if (!control || !line) return say(text.transient);
    line.textContent = text.field[campo];
    control.setAttribute("aria-invalid", "true");
    busy(false);
    control.focus();
  }

  function draft() {
    const senador = field("senador");
    const value = senador?.value ?? "";
    const nome =
      section.dataset.nome ??
      (senador instanceof HTMLSelectElement && value !== "site"
        ? (senador.selectedOptions[0]?.textContent ?? "").replace(/\s*\([^)]*\)$/, "")
        : null);
    return {
      senador: value,
      url: (field("url")?.value ?? "").trim(),
      comentario: (field("comentario")?.value ?? "").trim(),
      correcao: (field("correcao") as HTMLInputElement | null)?.checked ?? false,
      nome: value === "site" ? null : nome,
    };
  }

  function definitive(): void {
    const d = draft();
    status!.textContent = `${text.definitive} `;
    const a = Object.assign(document.createElement("a"), {
      href: mailtoFor(contato, { senador: d.nome, url: d.url, comentario: d.comentario, correcao: d.correcao }),
      textContent: contato,
      className: "text-accent underline",
    });
    status!.append(a);
    busy(false);
  }

  function receipt(protocolo: number, url: string, aboutSite: boolean): void {
    const line = Object.assign(document.createElement("p"), {
      textContent: aboutSite ? text.receivedSite : text.receivedSenator,
      className: "text-base",
      tabIndex: -1,
    });
    line.setAttribute("role", "status");
    const note = Object.assign(document.createElement("p"), { className: "mt-2 text-sm text-fg-muted" });
    note.append(
      Object.assign(document.createElement("a"), {
        href: url,
        rel: "noopener noreferrer",
        textContent: protocolText(protocolo),
        className: "text-sm text-fg-muted",
      }),
    );
    body!.replaceChildren(line, note);
    line.focus();
  }

  async function send(): Promise<void> {
    if (sending) return;
    const t = token;
    if (t === null) return;
    token = null; // single use: whatever the answer, the next try needs a new one
    sending = true;
    busy(true);
    const d = draft();
    let r: Response;
    try {
      r = await fetch("/api/fonte", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senador: d.senador, url: d.url, comentario: d.comentario, correcao: d.correcao, token: t }),
      });
    } catch {
      sending = false;
      fresh();
      return say(text.transient);
    }
    sending = false;
    const json = (await r.json().catch(() => ({}))) as { protocolo?: number; url?: string; campo?: string };
    if (r.status === 201 && typeof json.protocolo === "number" && typeof json.url === "string") {
      return receipt(json.protocolo, json.url, d.senador === "site");
    }
    fresh();
    if (r.status === 400 && (json.campo === "url" || json.campo === "comentario" || json.campo === "senador")) {
      return fieldError(json.campo);
    }
    if (r.status === 403) {
      refusals++;
      return refusals >= 2 ? definitive() : say(text.transient);
    }
    if (r.status === 500) return definitive();
    say(text.transient);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (sending || waiting) return;
    clearErrors();
    const senador = field("senador");
    if (senador && senador.value === "") return fieldError("senador");
    const url = field("url");
    if (url && (!url.checkValidity() || !url.value.trim().startsWith("https://"))) return fieldError("url");
    start();
    if (token !== null) return void send();
    // The widget usually answers within a second; if it never does, the visitor can try again.
    waiting = true;
    busy(true, text.verifying);
    window.setTimeout(() => {
      if (!waiting) return;
      waiting = false;
      fresh();
      say(text.transient);
    }, 15_000);
  });
}

for (const section of document.querySelectorAll<HTMLElement>("[data-source-form]")) setup(section);
