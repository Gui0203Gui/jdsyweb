// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '#lib/server/db/schema';
import type { Db } from '#lib/server/auth';

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			db: Db;
			user: User | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
