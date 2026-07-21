import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.YAQXUAN_BASE_URL ?? "http://localhost:5175";
const executablePath = process.env.PLAYWRIGHT_BROWSER_PATH;
const outputDir = path.resolve("tmp/qa/screens");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: true,
  args: ["--disable-background-timer-throttling"],
});

const runtimeErrors = [];

async function attachDiagnostics(page, name) {
  page.on("pageerror", (error) => runtimeErrors.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`${name}: ${message.text()}`);
  });
}

async function waitForImages(page) {
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );
}

async function screenshotRoute(page, route, filename, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseURL}${route}?preview=1`, { waitUntil: "networkidle" });
  await waitForImages(page);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "no-preference",
  });
  const page = await desktop.newPage();
  await attachDiagnostics(page, "desktop");

  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".birth-trigger").waitFor({ state: "visible" });
  assert.match(await page.locator(".birth-trigger").innerText(), /点击唤醒/);
  await page.screenshot({ path: path.join(outputDir, "birth-00-seed.png") });

  await page.locator(".birth-trigger").click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outputDir, "birth-01-light.png") });
  await page.waitForTimeout(1700);
  await page.screenshot({ path: path.join(outputDir, "birth-02-road.png") });
  await page.waitForTimeout(1900);
  await page.screenshot({ path: path.join(outputDir, "birth-03-memory.png") });
  await page.locator(".home-overlay").waitFor({ state: "visible", timeout: 9000 });
  assert.equal(await page.evaluate(() => sessionStorage.getItem("yaqxuan:world-born")), "1");
  await waitForImages(page);

  const firstLoadImages = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".webp")),
  );
  assert(firstLoadImages.some((name) => name.endsWith("world-home-anime.webp")));
  assert(!firstLoadImages.some((name) => name.endsWith("world-about-anime.webp")));
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(outputDir, "home-1920.png") });

  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".home-overlay").waitFor({ state: "visible", timeout: 2500 });
  assert.equal(await page.locator(".birth-trigger").count(), 0);

  await page.locator(".district-rail button").first().click();
  await page.waitForURL("**/imagine");
  await page.locator(".chapter-stage").waitFor({ state: "visible" });
  assert.equal(await page.locator(".chapter-navigation button").count(), 3);

  await page.locator(".chapter-navigation button").nth(1).click();
  assert.match(await page.locator(".chapter-stage h2").innerText(), /自己的宇宙/);
  await page.locator(".read-chapter").click();
  await page.locator(".reading-layer").waitFor({ state: "visible" });
  assert.match(await page.locator(".reading-layer").innerText(), /世界主权/);
  assert.equal(await page.locator(".chapter-stage").evaluate((element) => getComputedStyle(element).visibility), "hidden");
  assert(await page.locator(".reading-close").evaluate((element) => element === document.activeElement));
  await page.keyboard.press("Tab");
  assert(await page.locator(".reading-close").evaluate((element) => element === document.activeElement));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outputDir, "imagine-reading-1920.png") });
  await page.keyboard.press("Escape");
  await page.locator(".reading-layer").waitFor({ state: "detached" });
  assert(await page.locator(".read-chapter").evaluate((element) => element === document.activeElement));
  await page.keyboard.press("ArrowRight");
  assert.match(await page.locator(".chapter-stage h2").innerText(), /知识/);

  await page.goBack();
  await page.waitForURL(baseURL + "/");
  assert(!((await page.locator(".world-shell").getAttribute("class")) ?? "").includes("preview-"));
  await page.goForward();
  await page.waitForURL("**/imagine");

  await page.getByRole("button", { name: /生命/ }).first().click();
  await page.waitForURL("**/alive");
  assert.match(await page.locator(".district-intro h1").innerText(), /生命/);
  assert.equal(
    await page.getByRole("button", { name: /生命/ }).first().getAttribute("aria-current"),
    "page",
  );

  const soundButton = page.locator('.utility-bar button[aria-label="开启声音"]');
  await soundButton.click();
  const activeSoundButton = page.locator('.utility-bar button[aria-label="关闭声音"]');
  await activeSoundButton.waitFor();
  assert.equal(await activeSoundButton.getAttribute("aria-pressed"), "true");

  await page.getByRole("button", { name: /重新观看/ }).click();
  await page.waitForURL(baseURL + "/");
  await page.locator(".birth-beat").waitFor({ state: "visible", timeout: 1500 });
  await page.locator(".home-overlay").waitFor({ state: "visible", timeout: 9000 });

  await screenshotRoute(page, "/imagine", "imagine-1920.png", { width: 1920, height: 1080 });
  await screenshotRoute(page, "/alive", "alive-1440.png", { width: 1440, height: 900 });
  await screenshotRoute(page, "/connect", "connect-1920.png", { width: 1920, height: 1080 });
  await screenshotRoute(page, "/about", "about-1920.png", { width: 1920, height: 1080 });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const mobilePage = await mobile.newPage();
  await attachDiagnostics(mobilePage, "mobile");
  await mobilePage.goto(`${baseURL}/connect`, { waitUntil: "networkidle" });
  await mobilePage.locator(".static-experience").waitFor({ state: "visible" });
  assert.match(await mobilePage.locator(".static-copy").innerText(), /桌面屏幕/);
  assert.equal(await mobilePage.locator(".static-links button").count(), 4);
  await waitForImages(mobilePage);
  await mobilePage.screenshot({ path: path.join(outputDir, "mobile-connect-430.png") });
  await mobile.close();

  const reduced = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reduced.newPage();
  await attachDiagnostics(reducedPage, "reduced-motion");
  await reducedPage.goto(`${baseURL}/imagine`, { waitUntil: "networkidle" });
  assert.match(await reducedPage.locator(".static-copy").innerText(), /系统设置/);
  await reduced.close();

  const noWebGL = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const noWebGLPage = await noWebGL.newPage();
  await noWebGLPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      if (type === "webgl2") return null;
      return original.call(this, type, options);
    };
  });
  await noWebGLPage.goto(`${baseURL}/alive`, { waitUntil: "networkidle" });
  assert.match(await noWebGLPage.locator(".static-copy").innerText(), /WebGL 2/);
  await noWebGL.close();

  assert.deepEqual(runtimeErrors, [], `Browser runtime errors:\n${runtimeErrors.join("\n")}`);
  console.log(`QA passed. Screenshots: ${outputDir}`);
} finally {
  await browser.close();
}
