/**
 * File    : src/shared/i18n/index.js
 * Purpose : Locale resolver + t() — English default, বাংলা toggle.
 * Author  : Tasneem Bin Ahsan (TBA) · https://github.com/tbahsan
 */
import en from "./en.js";
import bn from "./bn.js";

const TABLES = { en, bn };
let current = "en";

export function setLocale(locale) {
  current = TABLES[locale] ? locale : "en";
}
export function getLocale() {
  return current;
}

/** t("selected", {count: 32}) → "32 videos selected" ({key} interpolated). */
export function t(key, params = {}) {
  const s = (TABLES[current] && TABLES[current][key]) || TABLES.en[key] || key;
  return s.replace(/\{(\w+)\}/g, (_m, p) => String(params[p] ?? `{${p}}`));
}
