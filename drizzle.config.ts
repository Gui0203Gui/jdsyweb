import { defineConfig } from 'drizzle-kit';

// 本地 generate 迁移不需要远程凭据；push/studio 到远程 D1 时才需要配置 .env
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
		databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? '',
		token: process.env.CLOUDFLARE_D1_TOKEN ?? ''
	},
	verbose: true,
	strict: true
});
