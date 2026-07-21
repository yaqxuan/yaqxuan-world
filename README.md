# YAQXUAN

`yaqxuan.com` 的正式网站项目，以“让想象成为可以进入的世界”为核心，呈现个人生成式宇宙的长期愿景。

网站不是传统的纵向宣传页。同一座城市持续存在，路由对应城市中的不同区域：

- `/`：世界诞生与城市入口
- `/imagine`：故事、个人宇宙与体验式知识
- `/alive`：角色身份、记忆、关系与世界主权
- `/connect`：AI、VR、BCI、感官反馈与验证顺序
- `/about`：项目性质、博客与联系方式

## 本地运行

项目约定的开发端口为 `5175`，预览端口为 `4175`。端口由本机 Codex 端口登记表统一管理。

```bash
npm install
npm run dev
```

生产构建与预览：

```bash
npm run build
npm run preview
```

首次运行浏览器验收前安装测试用 Chromium：

```bash
npx playwright-core install chromium
npm run qa:local
```

验收生产预览时可指定地址：

```bash
YAQXUAN_BASE_URL=http://localhost:4175 npm run qa:local
```

验收会实际检查世界诞生、会话记忆、重新观看、区域路由、章节阅读层、键盘焦点、声音开关、窄屏静态页、减少动态效果和 WebGL 失败降级，并在 `tmp/qa/screens` 生成视觉截图。

## 体验原则

- 桌面端提供实时三维世界诞生、区域切换、动态环境与可展开阅读层。
- 窄屏、减少动态效果偏好或 WebGL 2 不可用时，自动切换为可读的静态体验。
- 环境声默认关闭，只有访客主动开启后才会播放。
- 当前内容明确标注为愿景与学习阶段，不虚构团队、研究成果或成熟产品。
- 所有公开人物、城市与世界设定均为原创。
- 中文标题与正文使用本地子集化的 Noto CJK 开源字体，许可见 `public/fonts/OFL.txt`。

## 部署

项目可直接部署到 Cloudflare Pages：

- Node.js：22
- 构建命令：`npm run build`
- 输出目录：`dist`
- 生产分支：`main`

`public/_redirects` 提供 SPA 直达路由回退；`public/_headers`、`robots.txt` 与 `sitemap.xml` 会随构建复制到 `dist`。
