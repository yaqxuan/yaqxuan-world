export const supportedLocales = ["zh-CN", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const REALM_IDS = ["home", "imagine", "alive", "connect", "about"] as const;
export type RealmId = (typeof REALM_IDS)[number];

const STORAGE_KEY = "yaqxuan:locale";

const REALM_SEGMENTS: Record<RealmId, string> = {
  home: "",
  imagine: "imagine",
  alive: "alive",
  connect: "connect",
  about: "about",
};

export function parseLocation(
  pathname: string,
  search = "",
): { locale: Locale; realm: RealmId } {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);
  const queryLang = params.get("lang");

  let locale: Locale = "zh-CN";
  let rest = clean;

  if (clean === "/en" || clean.startsWith("/en/")) {
    locale = "en";
    rest = clean.slice(3) || "/";
  } else if (queryLang === "en") {
    locale = "en";
  }

  const segment = rest.replace(/^\/+/, "");
  const matched = (Object.entries(REALM_SEGMENTS) as Array<[RealmId, string]>).find(
    ([, seg]) => seg === segment,
  );
  const realm: RealmId = matched ? matched[0] : "home";

  return { locale, realm };
}

export function buildPath(locale: Locale, realm: RealmId): string {
  const seg = REALM_SEGMENTS[realm];
  if (locale === "en") {
    return seg ? `/en/${seg}` : "/en";
  }
  return seg ? `/${seg}` : "/";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "zh-CN" ? "en" : "zh-CN";
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures in restricted contexts.
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function readSavedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supportedLocales.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch {
    // Ignore storage failures.
  }
  return null;
}
