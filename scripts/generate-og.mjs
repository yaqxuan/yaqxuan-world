import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

function resolveBrowserExecutable() {
  if (process.env.PLAYWRIGHT_BROWSER_PATH && existsSync(process.env.PLAYWRIGHT_BROWSER_PATH)) {
    return process.env.PLAYWRIGHT_BROWSER_PATH;
  }
  const home = os.homedir();
  const candidates = [
    path.join(home, "Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
    path.join(home, "Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((p) => existsSync(p));
}

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
    const executablePath = resolveBrowserExecutable();
    const angleBackend = process.platform === "darwin" ? "metal" : "swiftshader";
    const browser = await chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: ["--use-gl=angle", `--use-angle=${angleBackend}`],
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
