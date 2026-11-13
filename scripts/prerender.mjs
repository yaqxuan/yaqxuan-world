import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist");
const BASE_URL = "https://yaqxuan.com";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadSiteData() {
  const tmpDir = path.join(ROOT, "tmp");
  await mkdir(tmpDir, { recursive: true });
  const bundlePath = path.join(tmpDir, "prerender-data.mjs");
  await build({
    entryPoints: [path.join(ROOT, "src", "content.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundlePath,
  });
  const contentMod = await import(pathToFileURL(bundlePath).href + `?t=${Date.now()}`);

  const i18nPath = path.join(tmpDir, "prerender-i18n.mjs");
  await build({
    entryPoints: [path.join(ROOT, "src", "i18n.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: i18nPath,
  });
  const i18nMod = await import(pathToFileURL(i18nPath).href + `?t=${Date.now()}`);

  await rm(bundlePath, { force: true });
  await rm(i18nPath, { force: true });

  return {
    CONTENT: contentMod.CONTENT,
    REALM_IDS: i18nMod.REALM_IDS,
    supportedLocales: i18nMod.supportedLocales,
    buildPath: i18nMod.buildPath,
  };
}

function buildNoscriptMarkup(copy, locale, realm, buildPath) {
  const navLinks = copy.nav.items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(buildPath(locale, item.id))}">${escapeHtml(item.index)} ${escapeHtml(item.label)}</a></li>`,
    )
    .join("");

  const sections = ["imagine", "alive", "connect"]
    .map((id) => {
      const r = copy.realms[id];
      const chapters = r.chapters
        .map(
          (ch) => `
          <article>
            <h4>${escapeHtml(ch.title)}</h4>
            <p>${escapeHtml(ch.summary)}</p>
            ${ch.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
            <blockquote>${escapeHtml(ch.aside)}</blockquote>
          </article>`,
        )
        .join("");
      return `<section><h3>${escapeHtml(r.index)} · ${escapeHtml(r.title)}</h3><p>${escapeHtml(r.lead)}</p>${chapters}</section>`;
    })
    .join("");

  return `<noscript><main data-prerender-realm="${escapeHtml(realm)}">
    <nav><ul>${navLinks}</ul></nav>
    <h1>${escapeHtml(copy.hero.titleLine1)} ${escapeHtml(copy.hero.titleLine2)}</h1>
    <p>${escapeHtml(copy.hero.lead)}</p>
    ${sections}
    <section>
      <h3>${escapeHtml(copy.about.index)} · ${escapeHtml(copy.about.title)}</h3>
      ${copy.about.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      <p><a href="${escapeHtml(copy.about.links.blog.url)}">${escapeHtml(copy.about.links.blog.value)}</a> · <a href="mailto:${escapeHtml(copy.about.links.email.value)}">${escapeHtml(copy.about.links.email.value)}</a></p>
    </section>
  </main></noscript>`;
}

async function run() {
  const { CONTENT, REALM_IDS, supportedLocales, buildPath } = await loadSiteData();
  const template = await readFile(path.join(DIST_DIR, "index.html"), "utf-8");

  const sitemapUrls = [];

  for (const locale of supportedLocales) {
    const copy = CONTENT[locale];
    const ogLocale = locale === "zh-CN" ? "zh_CN" : "en_US";

    for (const realm of REALM_IDS) {
      const routePath = buildPath(locale, realm);
      const canonical = `${BASE_URL}${routePath}`;
      const zhAlt = `${BASE_URL}${buildPath("zh-CN", realm)}`;
      const enAlt = `${BASE_URL}${buildPath("en", realm)}`;
      const meta = copy.routeMeta[realm];
      const ogImage = `${BASE_URL}/og/og-${realm}-${locale}.png`;

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": realm === "home" ? "WebSite" : "WebPage",
        name: meta.title,
        description: meta.description,
        url: canonical,
        inLanguage: locale,
        author: {
          "@type": "Person",
          name: "Yaqxuan",
          url: "https://yaqxuan.xyz",
        },
      });

      const headTags = [
        `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
        `<link rel="alternate" hreflang="zh-CN" href="${escapeHtml(zhAlt)}" />`,
        `<link rel="alternate" hreflang="en" href="${escapeHtml(enAlt)}" />`,
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(zhAlt)}" />`,
        `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
        `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
        `<script type="application/ld+json">${jsonLd}</script>`,
      ].join("\n    ");

      let html = template
        .replace(/<html lang="[^"]*">/, `<html lang="${locale}">`)
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
        .replace(
          /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
          `<meta name="description" content="${escapeHtml(meta.description)}" />`,
        )
        .replace(
          /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
          `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
        )
        .replace(
          /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
          `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
        )
        .replace(
          /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
          `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
        )
        .replace(
          /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/,
          `<meta property="og:locale" content="${ogLocale}" />`,
        )
        .replace(
          /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
          `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
        )
        .replace("</head>", `    ${headTags}\n  </head>`)
        .replace(
          '<div id="root"></div>',
          `<div id="root"></div>\n    ${buildNoscriptMarkup(copy, locale, realm, buildPath)}`,
        );

      const outFile =
        routePath === "/"
          ? path.join(DIST_DIR, "index.html")
          : path.join(DIST_DIR, routePath.replace(/^\/+/, ""), "index.html");
      await mkdir(path.dirname(outFile), { recursive: true });
      await writeFile(outFile, html, "utf-8");

      sitemapUrls.push({ canonical, zhAlt, enAlt });
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls
  .map(
    (entry) => `  <url>
    <loc>${escapeHtml(entry.canonical)}</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${escapeHtml(entry.zhAlt)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(entry.enAlt)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(entry.zhAlt)}" />
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  await writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemapXml, "utf-8");
  await writeFile(path.join(ROOT, "public", "sitemap.xml"), sitemapXml, "utf-8");
  console.log(`Prerendered ${sitemapUrls.length} bilingual static HTML routes + sitemap.xml.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
