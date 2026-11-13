import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTERNAL_BASE_URL = process.env.YAQXUAN_BASE_URL;
const PORT = 4175;
const BASE_URL = EXTERNAL_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const OUTPUT_DIR = path.join(ROOT, "tmp", "qa", "screens");

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

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let server = null;
  if (!EXTERNAL_BASE_URL) {
    server = spawn(
      "npx",
      ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
      { cwd: ROOT, stdio: "ignore" },
    );
    await waitForServer(BASE_URL);
  }

  const executablePath = process.env.PLAYWRIGHT_BROWSER_PATH;
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--disable-background-timer-throttling", "--use-gl=angle", "--use-angle=swiftshader"],
  });

  const runtimeErrors = [];
  const attachDiagnostics = (page, tag) => {
    page.on("pageerror", (error) => runtimeErrors.push(`${tag} pageerror: ${error.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") runtimeErrors.push(`${tag} console.error: ${msg.text()}`);
    });
  };

  try {
    // 1. Pre-rendered HTML metadata check (both dist files & preview server)
    const aliveDiskHtml = await readFile(path.join(ROOT, "dist", "alive", "index.html"), "utf-8");
    assert.match(aliveDiskHtml, /<title>生命 — YAQXUAN<\/title>/);
    assert.match(aliveDiskHtml, /<link rel="canonical" href="https:\/\/yaqxuan\.com\/alive"/);
    assert.match(aliveDiskHtml, /og-alive-zh-CN\.png/);

    const enConnectHtml = await (await fetch(`${BASE_URL}/en/connect/`)).text();
    assert.match(enConnectHtml, /<title>Connect — YAQXUAN<\/title>/);
    assert.match(enConnectHtml, /<link rel="canonical" href="https:\/\/yaqxuan\.com\/en\/connect"/);
    assert.match(enConnectHtml, /og-connect-en\.png/);

    // 2. Desktop 1920x1080 full journey
    const desktop = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await desktop.newPage();
    attachDiagnostics(page, "desktop-1920");

    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#hero-title").waitFor({ state: "visible" });
    assert.match(await page.locator("#hero-title").innerText(), /让想象成为/);
    await page.locator(".world-canvas canvas").waitFor({ state: "visible", timeout: 8000 });
    assert.equal(await page.locator(".world-canvas canvas").count(), 1);
    assert.equal(await page.locator(".world-navigation a").count(), 5);

    // Pulse genesis interaction
    await page.getByRole("button", { name: /唤醒创世脉冲/ }).click();
    await page.getByRole("button", { name: /星穹已回应/ }).waitFor({ state: "visible" });
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "home-1920.png") });

    // Verify all 9 chapters & roadmap & about links exist without popups
    assert.equal(await page.locator(".chapter-card").count(), 9);
    assert.equal(await page.locator('a[href="https://yaqxuan.xyz"]').count(), 1);
    assert.equal(await page.locator('a[href="mailto:hello@yaqxuan.com"]').count(), 1);

    // Navigate via scroll / section check
    for (const [id, expectedPath] of [
      ["imagine", "/imagine"],
      ["alive", "/alive"],
      ["connect", "/connect"],
      ["about", "/about"],
    ]) {
      await page.locator(`#section-${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      const currentPath = new URL(page.url()).pathname;
      assert.equal(currentPath, expectedPath, `Expected URL path ${expectedPath}, got ${currentPath}`);
    }

    // Interactive roadmap check on connect
    await page.locator("#section-connect").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.getByRole("tab", { name: /非侵入式脑机接口/ }).click();
    assert.match(await page.locator(".roadmap-detail h4").innerText(), /04 · 非侵入式脑机接口/);
    await page.waitForTimeout(280);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "connect-1920.png") });

    await page.locator("#section-imagine").scrollIntoViewIfNeeded();
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "imagine-1920.png") });

    await page.locator("#section-about").scrollIntoViewIfNeeded();
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "about-1920.png") });

    // Sound toggle check
    const soundBtn = page.locator(".sound-toggle");
    await soundBtn.click();
    assert.equal(await soundBtn.getAttribute("aria-pressed"), "true");
    await soundBtn.click();
    assert.equal(await soundBtn.getAttribute("aria-pressed"), "false");

    // In-place language toggle to EN and back
    await page.locator("#section-home").scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    await page.locator(".locale-switch").click();
    await page.waitForURL("**/en");
    assert.match(await page.locator("#hero-title").innerText(), /Where Imagination Becomes/);
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "home-en-1920.png") });

    await page.locator(".locale-switch").click();
    await page.waitForURL(`${BASE_URL}/`);
    assert.match(await page.locator("#hero-title").innerText(), /让想象成为/);
    await desktop.close();

    // 3. Desktop 1440x900 direct deep-link to /alive
    const laptop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const laptopPage = await laptop.newPage();
    attachDiagnostics(laptopPage, "desktop-1440");
    await laptopPage.goto(`${BASE_URL}/alive`, { waitUntil: "networkidle" });
    await laptopPage.evaluate(() => document.fonts.ready);
    await laptopPage.waitForTimeout(550);
    const aliveBox = await laptopPage.locator("#section-alive").boundingBox();
    assert(aliveBox && Math.abs(aliveBox.y) < 160, "Deep link /alive should scroll directly to #section-alive");
    await laptopPage.screenshot({ path: path.join(OUTPUT_DIR, "alive-1440.png") });
    await laptop.close();

    // 4. Mobile 430x932 & 390x844 full experience (NO legacy StaticExperience!)
    for (const [w, h, shotName] of [
      [430, 932, "mobile-home-430.png"],
      [390, 844, "mobile-connect-390.png"],
    ]) {
      const mobile = await browser.newContext({ viewport: { width: w, height: h } });
      const mobilePage = await mobile.newPage();
      attachDiagnostics(mobilePage, `mobile-${w}`);
      const targetUrl = w === 390 ? `${BASE_URL}/connect` : `${BASE_URL}/`;
      await mobilePage.goto(targetUrl, { waitUntil: "networkidle" });
      await mobilePage.evaluate(() => document.fonts.ready);
      await mobilePage.waitForTimeout(550);

      assert.equal(await mobilePage.locator(".static-experience").count(), 0);
      const bodyText = await mobilePage.locator("body").innerText();
      assert(!bodyText.includes("桌面屏幕"), "Mobile must not display legacy desktop-only fallback message");
      await mobilePage.locator(".world-canvas canvas").waitFor({ state: "visible", timeout: 8000 });
      assert.equal(await mobilePage.locator(".world-canvas canvas").count(), 1);
      assert.equal(await mobilePage.locator(".chapter-card").count(), 9);
      assert.equal(await mobilePage.locator(".mobile-dock a").count(), 5);

      const overflow = await mobilePage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      assert.equal(overflow, false, `Mobile ${w}x${h} has horizontal overflow`);

      await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, shotName) });
      await mobile.close();
    }

    // 5. Reduced-motion & No-WebGL2 fallback
    const reduced = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const reducedPage = await reduced.newPage();
    attachDiagnostics(reducedPage, "reduced-motion");
    await reducedPage.goto(`${BASE_URL}/imagine`, { waitUntil: "networkidle" });
    assert.equal(await reducedPage.locator(".chapter-card").count(), 9);
    await reduced.close();

    const noWebGL = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const noWebGLPage = await noWebGL.newPage();
    attachDiagnostics(noWebGLPage, "no-webgl2");
    await noWebGLPage.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === "webgl2") return null;
        return original.call(this, type, options);
      };
    });
    await noWebGLPage.goto(`${BASE_URL}/alive`, { waitUntil: "networkidle" });
    await noWebGLPage.waitForTimeout(450);
    assert.equal(await noWebGLPage.locator(".astral-static-backdrop").count(), 1);
    assert.equal(await noWebGLPage.locator(".chapter-card").count(), 9);
    assert.equal(await noWebGLPage.locator('a[href="https://yaqxuan.xyz"]').count(), 1);
    await noWebGLPage.screenshot({ path: path.join(OUTPUT_DIR, "nowebgl-1440.png") });
    await noWebGL.close();

    assert.deepEqual(runtimeErrors, [], `Runtime errors detected:\n${runtimeErrors.join("\n")}`);
    console.log(`QA passed cleanly across all viewports and modes. Screenshots: ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
    if (server) server.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
