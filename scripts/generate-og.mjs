import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OG_DIR = path.join(ROOT, "public", "og");
const PORT = 4176;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const REALMS = ["home", "imagine", "alive", "connect", "about"];
const LOCALES = ["zh-CN", "en"];

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Retry until ready.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not start at ${url} within ${timeoutMs}ms`);
}

async function main() {
  await mkdir(OG_DIR, { recursive: true });

  const server = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore" },
  );

  try {
    await waitForServer(BASE_URL);
    const executablePath = process.env.PLAYWRIGHT_BROWSER_PATH;
    const browser = await chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: ["--use-gl=angle", "--use-angle=swiftshader"],
    });

    try {
      const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });
      const page = await context.newPage();

      for (const locale of LOCALES) {
        const prefix = locale === "en" ? "/en" : "/";
        for (const realm of REALMS) {
          const url = `${BASE_URL}${prefix}?og=1&realm=${realm}`;
          await page.goto(url, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(550);
          const outPath = path.join(OG_DIR, `og-${realm}-${locale}.png`);
          await page.screenshot({ path: outPath, type: "png" });
          console.log(`Generated ${path.relative(ROOT, outPath)}`);
        }
      }

      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
