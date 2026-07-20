export const supportedLocales = ["zh-CN"] as const;

export type Locale = (typeof supportedLocales)[number];

const STORAGE_KEY = "yaqxuan:locale";
const fallbackLocale: Locale = "zh-CN";

export function resolveLocale(): Locale {
  const preferred = localStorage.getItem(STORAGE_KEY);
  if (preferred && supportedLocales.includes(preferred as Locale)) {
    return preferred as Locale;
  }

  const browserLocale = navigator.languages.find((locale) =>
    supportedLocales.some((supported) => locale.toLowerCase().startsWith(supported.toLowerCase())),
  );
  return browserLocale ? (browserLocale as Locale) : fallbackLocale;
}

export function saveLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}
