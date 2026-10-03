# 交大实验网（jdsyweb）

**交大实验网**是一个面向学校师生的民间非官方贴吧网站。技术栈：**SvelteKit + Cloudflare Pages + Workers + D1 + KV**。

## 技术架构

| 层       | 技术                                    | 说明                           |
| -------- | --------------------------------------- | ------------------------------ |
| 前端框架 | SvelteKit 3（Svelte 5 runes）           | 全栈框架，SSR 默认             |
| 部署     | Cloudflare Pages（Functions = Workers） | `@sveltejs/adapter-cloudflare` |
| 数据库   | Cloudflare D1（SQLite）                 | 通过 Drizzle ORM 访问          |
| 文件存储 | Cloudflare KV（STORAGE 绑定）           | 帖子图片、HTML 作品            |
| ORM      | Drizzle + drizzle-kit                   | 类型安全，schema 即代码        |

## 目录结构

```
src/
├── app.css                # 全局样式（贴吧风格）
├── app.d.ts               # App.Locals 类型（db / user）
├── hooks.server.ts        # 注入 D1、恢复会话、清理过期会话
├── lib/
│   ├── time.ts            # 时间格式化工具
│   └── server/
│       ├── auth.ts        # 密码哈希（PBKDF2）+ 会话管理
│       ├── points.ts      # 积分系统 + KV 文件存储
│       ├── db/
│       │   ├── schema.ts  # D1 表定义（10 张表）
│       │   └── index.ts   # Drizzle 客户端
│       └── queries.ts     # 查询层（帖子流/板块/回复/点赞/收藏/作品）
└── routes/
    ├── +page.svelte       # 首页：板块导航 + 最新帖子 + 最新作品
    ├── +layout.svelte     # 顶栏（板块/签到/作品集/积分/登录态）
    ├── forum/[slug]/      # 板块页
    ├── post/[id]/         # 帖子详情 + 回复 + 点赞 + 收藏 + 图片
    ├── post/new/          # 发帖（文字 + 图片）
    ├── works/             # 作品集列表
    ├── works/new/         # 上传 HTML 作品
    ├── works/[id]/        # 作品详情（在线预览 + 下载）
    ├── signin/            # 每日签到
    ├── api/upload/        # 图片上传接口（存入 KV）
    ├── api/img/[key]/     # 图片读取接口
    ├── api/work/[id]/preview/   # 作品预览接口
    ├── api/work/[id]/download/  # 作品下载接口
    ├── login/ register/   # 登录 / 注册
    └── logout/            # 登出
```

## 数据库表（D1）

- `users`：用户名、PBKDF2 密码哈希、头像、角色、**积分（points）**
- `forums`：板块（slug、名称、图标、排序）
- `posts`：帖子（板块、作者、标题、内容、**图片列表 images**、浏览量、置顶/锁定）
- `comments`：回复（帖子、作者、内容）
- `likes`：点赞（帖子/回复通用，唯一约束防重复）
- `favorites`：收藏（用户 + 帖子唯一）
- `sign_ins`：签到（用户 + 日期唯一，每天一次）
- `works`：作品集（作者、标题、简介、文件名、KV key、大小、浏览量）
- `point_logs`：积分流水（变动值、原因、关联对象）
- `sessions`：服务端会话（30 天过期）

## 积分规则

| 行为     | 积分 |
| -------- | ---- |
| 发帖     | +10  |
| 评论     | +5   |
| 点赞     | +2   |
| 收藏帖子 | +3   |
| 每日签到 | +5   |
| 上传作品 | +20  |

> 积分规则在 `src/lib/server/points.ts` 的 `POINT_RULES` 常量中，可按需调整。

## 本地开发

> 本地需要 D1 运行时，请用 Cloudflare 模拟环境而非纯 vite。

```sh
npm install

# 1) 初始化本地 D1：应用迁移 + 写入初始板块
npm run db:setup:local

# 2) 构建并以 Cloudflare Pages 模式本地运行（模拟 Workers 环境，含 D1 + KV）
npm run dev:cf
# 打开 http://localhost:8788
```

常用命令：

```sh
npm run dev             # 纯 vite（无 D1，仅调试 UI）
npm run check           # wrangler types + svelte-check
npm run lint            # prettier + eslint
npm run build           # 生产构建（输出到 .svelte-kit/cloudflare）
npm run db:migrate:local  # 仅应用迁移到本地 D1
npm run db:seed:local     # 仅写入种子板块
npm run db:studio         # Drizzle Studio（需远程凭据）
```

## 部署到 Cloudflare（生产）

本项目已配置 GitHub 仓库自动部署：推送到 `main` 分支后，Cloudflare Pages 自动构建上线。

手动部署流程：

1. 创建远程 D1 数据库并拿到 `database_id`：

   ```sh
   npx wrangler d1 create jdsyweb
   ```

2. 把返回的 `database_id` 填进 `wrangler.jsonc`。

3. 创建 KV namespace（存储图片与作品）：

   ```sh
   npx wrangler kv namespace create JDSYWEB_STORAGE
   ```

   把返回的 `id` 填进 `wrangler.jsonc` 的 `kv_namespaces[0].id`。

4. 配置 `.env`（用于 drizzle push / studio）：

   ```
   CLOUDFLARE_ACCOUNT_ID=""
   CLOUDFLARE_DATABASE_ID=""
   CLOUDFLARE_D1_TOKEN=""
   ```

5. 应用迁移 + 种子数据到远程：

   ```sh
   npm run db:setup:remote
   ```

6. 构建并部署 Pages：

   ```sh
   npm run build
   npx wrangler pages deploy .svelte-kit/cloudflare --project-name jdsyweb
   ```

## 功能清单

- [x] 注册 / 登录 / 登出（PBKDF2 密码哈希 + D1 会话）
- [x] 板块列表与板块页（校园生活定位）
- [x] 发帖（标题 + 内容 + 图片，图片存 KV）
- [x] 帖子详情 + 楼层回复 + 图片展示
- [x] 帖子/回复点赞（可取消，点赞加分）
- [x] 收藏帖子（可取消，收藏加分）
- [x] 每日签到（+5 积分）
- [x] 积分系统（发帖/评论/点赞/收藏/签到/上传作品）
- [x] 作品集：上传 HTML、在线预览（沙箱）、下载
- [x] 浏览量统计、置顶/锁定字段（管理端 UI 待做）
- [ ] 管理后台（置顶/锁定/删帖）
- [ ] 个人主页 / 头像上传
- [ ] 搜索、分页、@ 提醒
