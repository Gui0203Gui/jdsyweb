import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import { checkAchievements, listForums, notifyMentions } from '#lib/server/queries';
import { posts } from '#lib/server/db/schema';
import { awardPoints } from '#lib/server/points';

const POST_INTERVAL_MS = 5 * 60 * 1000; // 普通用户每 5 分钟可发一次帖（管理员不限）

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login?redirect=/post/new');

	const forums = await listForums(locals.db);
	return { forums };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });

		const form = await request.formData();
		const forumId = String(form.get('forumId') ?? '');
		const title = String(form.get('title') ?? '').trim();
		const content = String(form.get('content') ?? '').trim();

		// 图片 key 列表：客户端上传后把 key 放进隐藏字段，多个用逗号分隔
		const imagesRaw = String(form.get('images') ?? '').trim();
		const images = imagesRaw
			? imagesRaw
					.split(',')
					.map((k) => k.trim())
					.filter((k) => k.startsWith('img/'))
			: [];

		// 发帖频率限制：5 分钟一次（管理员不限）
		if (locals.user.role !== 'admin') {
			const last = await locals.db
				.select({ createdAt: posts.createdAt })
				.from(posts)
				.where(eq(posts.authorId, locals.user.id))
				.orderBy(desc(posts.createdAt))
				.limit(1);
			const lastAt = last[0]?.createdAt?.getTime?.() ?? 0;
			const waitMs = POST_INTERVAL_MS - (Date.now() - lastAt);
			if (waitMs > 0) {
				const m = Math.ceil(waitMs / 60000);
				return fail(429, { error: `发帖太频繁：每 5 分钟只能发一次帖，请 ${m} 分钟后再试` });
			}
		}

		if (!forumId) return fail(400, { error: '请选择板块' });
		if (!title) return fail(400, { error: '标题不能为空' });
		if (title.length > 80) return fail(400, { error: '标题过长（最多 80 字）' });
		if (!content) return fail(400, { error: '内容不能为空' });
		if (content.length > 20000) return fail(400, { error: '内容过长（最多 20000 字）' });
		if (images.length > 50) return fail(400, { error: '图片最多 50 张' });

		// 投票帖：pollEnabled=1 时解析选项（每行一个，2~10 项）
		let pollOptions: string[] | null = null;
		if (String(form.get('pollEnabled') ?? '') === '1') {
			const raw = String(form.get('pollOptions') ?? '').trim();
			const options = raw
				.split('\n')
				.map((o) => o.trim())
				.filter((o) => o.length > 0);
			if (options.length < 2) return fail(400, { error: '投票帖至少需要 2 个选项' });
			if (options.length > 10) return fail(400, { error: '投票选项最多 10 个' });
			for (const o of options) {
				if (o.length > 60) return fail(400, { error: '单个选项最长 60 字' });
			}
			pollOptions = options;
		}

		const inserted = await locals.db
			.insert(posts)
			.values({
				forumId,
				authorId: locals.user.id,
				title,
				content,
				images: JSON.stringify(images),
				pollOptions: pollOptions ? JSON.stringify(pollOptions) : null
			})
			.returning({ id: posts.id });

		const postId = inserted[0]?.id;
		if (!postId) return fail(500, { error: '发帖失败，请稍后再试' });

		// 发帖积分 +10
		await awardPoints(locals.db, locals.user.id, 'post', postId);

		// @提及通知
		await notifyMentions(locals.db, `${title} ${content}`, locals.user.id, postId);

		// 成就检查：首个帖子
		await checkAchievements(locals.db, locals.user.id);

		redirect(303, `/post/${postId}`);
	}
};
