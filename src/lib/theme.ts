export type Theme = "light" | "dark";

/** The button shows where a click takes the page, not where the page is. */
export const themeToggleLabel = (current: Theme): string => (current === "dark" ? "Tema claro" : "Tema escuro");
