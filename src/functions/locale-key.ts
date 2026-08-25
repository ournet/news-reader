import { Locale } from "../types";

export function localeKey(locale: Locale) {
  return `${locale.lang.toLowerCase()}-${locale.country.toLowerCase()}`;
}
