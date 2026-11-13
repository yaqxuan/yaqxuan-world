# YAQXUAN (`yaqxuan.com`)

`yaqxuan.com` 的正式网站项目，以“让想象成为可以进入的世界”为核心，呈现个人生成式宇宙的长期愿景。

- **生产域名**：<https://yaqxuan.com>（Cloudflare Pages `yaqxuan-world` 项目 `main` 分支）
- **本地开发端口**：`5175`（预览端口：`4175`）

## 核心架构

网站采用 **一镜到底连续空间漫游 + 独立路由直达双模**：

- `/` & `/en`：入口（Threshold · 天文星盘 3D 雕塑）
- `/imagine` & `/en/imagine`：想象（Story Archipelago · 叙事浮岛群）
- `/alive` & `/en/alive`：生命（Living Memory Core · 记忆回声核）
- `/connect` & `/en/connect`：连接（Synapse Bridge · 双向脉冲桥与五阶段验证路线）
- `/about` & `/en/about`：关于（Origin Horizon Spire · 个人长期探索、`yaqxuan.xyz` 与 `hello@yaqxuan.com`）

桌面与移动端均完整呈现实时 WebGL 2 着色器海面、五座持久 3D 空间雕塑、全部 9 个章节正文、可交互验证路线图与环境声景（默认关闭）；仅当设备不支持 WebGL 2 时降级为同等完整内容的星图矢量背景。

## 本地命令

```bash
npm install

# 启动本地开发
npm run dev

# 扫描全量源码字符并重建中英双语 WOFF2 字体子集
npm run fonts:subset

# 构建 + 生成 10 条中英文路由静态预渲染 HTML 与 sitemap.xml
npm run build

# 捕获 1200x630 双语社交 OG 分享图
npm run og:generate

# 运行 Playwright 全端视觉与功能自动化验收
npm run qa:local
```

## 部署与 `www` 重定向

- `main` 分支绑定 Cloudflare Pages 自动生产部署（Node 22，`npm run build`，输出 `dist`）。
- 新功能与视觉改版先在独立分支预览（如 `feat/v2-overhaul` -> `feat-v2-overhaul.yaqxuan-world.pages.dev`），确认后合并上线。
- `workers/www-redirect` 负责将 `www.yaqxuan.com` 301 永久重定向至 `https://yaqxuan.com`。
