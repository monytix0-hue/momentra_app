/**
 * Business shell theme (web). Phase 2: flip `light` and define light tokens in globals.css
 * under `[data-context="business"][data-business-theme="light"]`.
 */
export type BusinessThemeMode = "dark" | "light";

export const BUSINESS_THEME_DEFAULT: BusinessThemeMode = "dark";

export function readBusinessThemeMode(): BusinessThemeMode {
  if (typeof document === "undefined") return BUSINESS_THEME_DEFAULT;
  return document.documentElement.getAttribute("data-business-theme") === "light" ? "light" : "dark";
}

export function setBusinessThemeMode(mode: BusinessThemeMode): void {
  if (typeof document === "undefined") return;
  if (mode === "light") {
    document.documentElement.setAttribute("data-business-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-business-theme");
  }
}
