# 交大实验网（jdsyweb）

民间非官方贴吧网站。技术栈：**SvelteKit + Cloudflare Pages + Workers + D1**。

## 技术架构

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | SvelteKit 3（Svelte 5 runes） | 全栈框架，SSR 默认 |
| 部署 | Cloudflare Pages（Functions = Workers） | `@sveltejs/adapter-cloudflare` |
| 数据库 | Cloudflare D1（SQLite） | 通过 Drizzle ORM 访问 |
| ORM | Drizzle + drizzle-kit | 类型安全，schema 即代码 |

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
│       ├── db/
│       │   ├── schema.ts  # D1 表定义（users/forums/posts/comments/likes/sessions）
│       │   └── index.ts   # Drizzle 客户端
│       └── queries.ts     # 贴吧查询层（帖子流/板块/回复/点赞）
└── routes/
    ├── +page.svelte       # 首页：板块导航 + 最新帖子流
    ├── +layout.svelte     # 顶栏（板块/登录态/发帖入口）
    ├── forum/[slug]/      # 板块页
    ├── post/[id]/         # 帖子详情 + 回复 + 点赞
    ├── post/new/          # 发帖
    ├── login/ register/   # 登录 / 注册
    └── logout/            # 登出
```

## 数据库表（D1）

- `users`：用户名、PBKDF2 密码哈希、头像、角色
- `forums`：板块（slug、名称、图标、排序）
- `posts`：帖子（板块、作者、标题、内容、浏览量、置顶/锁定）
- `comments`：回复（帖子、作者、内容）
- `likes`：点赞（帖子/回复通用，唯一约束防重复）
- `sessions`：服务端会话（30 天过期）

## 本地开发

> 本地需要 D1 运行时，请用 Cloudflare 模拟环境而非纯 vite。

```sh
npm install

# 1) 初始化本地 D1：应用迁移 + 写入初始板块
npm run db:setup:local

# 2) 构建并以 Cloudflare Pages 模式本地运行（模拟 Workers 环境，含 D1）
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

1. 创建远程 D1 数据库并拿到 `database_id`：

   ```sh
   npx wrangler d1 create jdsyweb
   ```

2. 把返回的 `database_id` 填进 `wrangler.jsonc`（当前为占位 UUID）。

3. 配置 `.env`（用于 drizzle push / studio）：

   ```
   CLOUDFLARE_ACCOUNT_ID=""
   CLOUDFLARE_DATABASE_ID=""
   CLOUDFLARE_D1_TOKEN=""
   ```

4. 应用迁移 + 种子数据到远程：

   ```sh
   npm run db:setup:remote
   ```

5. 构建并部署 Pages：

   ```sh
   npm run build
   npx wrangler pages deploy .svelte-kit/cloudflare --project-name jdsyweb
   ```

> 生产环境建议将 `login/register` 中 cookie 的 `secure` 改为 `true`（HTTPS 部署时）。

## 功能清单（当前基础版）

- [x] 注册 / 登录 / 登出（PBKDF2 密码哈希 + D1 会话）
- [x] 板块列表与板块页
- [x] 发帖（标题 + 内容，板块选择）
- [x] 帖子详情 + 楼层回复
- [x] 帖子/回复点赞（可取消）
- [x] 浏览量统计、置顶/锁定字段（管理端 UI 待做）
- [ ] 管理后台（置顶/锁定/删帖）
- [ ] 个人主页 / 头像上传
- [ ] 搜索、分页、@ 提醒
