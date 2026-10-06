import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	checkAchievements,
	countUnreadMessages,
	getUserByUsername,
	listConversations,
	listMessagesBetween,
	sendMessage
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/login?redirect=/messages');

	const to = url.searchParams.get('to') ?? '';
	let peer = null;
	if (to) {
		peer = await getUserByUsername(locals.db, to);
		if (!peer) peer = null;
	}

	const conversations = await listConversations(locals.db, locals.user.id);

	// 若指定了会话对象，加载与该对象的聊天记录
	let messages: Awaited<ReturnType<typeof listMessagesBetween>> = [];
	if (peer && peer.id !== locals.user.id) {
		messages = await listMessagesBetween(locals.db, locals.user.id, peer.id);
	}

	const unread = await countUnreadMessages(locals.db, locals.user.id);
	return { conversations, peer, messages, unread };
};

export const actions: Actions = {
	/** 发送私信 */
	send: async ({ request, locals, url }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });

		const form = await request.formData();
		const to = String(form.get('to') ?? '').trim();
		const content = String(form.get('content') ?? '').trim();

		const target = await getUserByUsername(locals.db, to);
		if (!target) return fail(400, { error: '用户不存在' });
		if (target.id === locals.user.id) return fail(400, { error: '不能给自己发私信' });

		const result = await sendMessage(locals.db, locals.user.id, target.id, content);
		if (!result.ok) return fail(400, { error: result.error });

		// 成就检查：发送方（鸿雁传书是收到私信，这里检查接收方）
		await checkAchievements(locals.db, target.id);

		return { ok: true, to };
	}
};
