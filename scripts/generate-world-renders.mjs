import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "worlds");
const PORT = 4177;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const WORLDS = [
  "aether-sanctuary",
  "astral-citadel",
  "abyssal-garden",
  "aurora-prism",
  "solaris-oasis",
  "emerald-terraces",
];

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
  await mkdir(OUT_DIR, { recursive: true });

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
      args: ["--disable-background-timer-throttling", "--use-gl=angle", `--use-angle=${angleBackend}`],
    });

    try {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await context.newPage();

      const activeWorlds = process.env.WORLD_FILTER
        ? WORLDS.filter((w) => w === process.env.WORLD_FILTER)
        : WORLDS;

      for (const worldId of activeWorlds) {
        for (const shot of ["primary", "alt"]) {
          const url = `${BASE_URL}/?worldCapture=${worldId}&shot=${shot}`;
          await page.goto(url, { waitUntil: "networkidle" });
          await page
            .locator('.world-capture-stage[data-capture-ready="true"]')
            .waitFor({ state: "attached", timeout: 20000 });
          await page.waitForTimeout(120);

          const dataUrl = await page.evaluate(() => {
            const srcCanvas = document.querySelector(".explorer-canvas-host canvas");
            if (!(srcCanvas instanceof HTMLCanvasElement)) {
              throw new Error("Capture WebGL canvas not found");
            }
            const out = document.createElement("canvas");
            out.width = 1600;
            out.height = 1000;
            const ctx = out.getContext("2d");
            if (!ctx) throw new Error("2D context unavailable");
            ctx.drawImage(srcCanvas, 0, 0, 1600, 1000);
            return out.toDataURL("image/webp", 0.92);
          });

          const base64 = dataUrl.replace(/^data:image\/webp;base64,/, "");
          const buf = Buffer.from(base64, "base64");
          const outFile = path.join(OUT_DIR, `${worldId}-${shot}.webp`);
          await writeFile(outFile, buf);
          console.log(
            `Rendered ${path.relative(ROOT, outFile)} (${(buf.byteLength / 1024).toFixed(1)} KB)`,
          );
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
