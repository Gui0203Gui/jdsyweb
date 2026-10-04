import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	cancelTeacherLike,
	countApprovedTeachers,
	createTeacher,
	getTeacher,
	getTeacherLikeToday,
	likeTeacher,
	likedTeacherIds,
	listTeachers
} from '#lib/server/queries';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
	const [teachers, total] = await Promise.all([
		listTeachers(locals.db, (page - 1) * PAGE_SIZE, PAGE_SIZE),
		countApprovedTeachers(locals.db)
	]);

	let likedIds = new Set<string>();
	if (locals.user) {
		likedIds = await likedTeacherIds(
			locals.db,
			locals.user.id,
			teachers.map((t) => t.id)
		);
	}

	return {
		teachers,
		page,
		pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		likedIds: [...likedIds]
	};
};

export const actions: Actions = {
	/** 提交老师（进入待审核） */
	submit: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const avatar = String(form.get('avatar') ?? '').trim();

		if (!name) return fail(400, { error: '请填写老师姓名' });
		if (name.length > 30) return fail(400, { error: '老师姓名不能超过 30 字' });
		if (description.length > 200) return fail(400, { error: '简介不能超过 200 字' });

		const id = await createTeacher(locals.db, {
			name,
			avatar,
			description,
			createdBy: locals.user.id
		});
		return { ok: true, submittedId: id, name };
	},

	/** 老师点赞（每位老师每天最多 1 次；已赞再点=取消，取消后当天不能再点） */
	like: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });
		const form = await request.formData();
		const teacherId = String(form.get('teacherId') ?? '');
		if (!teacherId) return fail(400, { error: '缺少老师 ID' });

		const teacher = await getTeacher(locals.db, teacherId);
		if (!teacher || teacher.status !== 'approved') {
			return fail(404, { error: '老师不存在或未通过审核' });
		}

		const today = await getTeacherLikeToday(locals.db, locals.user.id, teacherId);
		if (today) {
			if (today.cancelled !== 0) {
				// 今天已经点过又取消了 → 当天不能再点
				return fail(400, { error: '今天已经给这位老师投过票啦，明天再来吧' });
			}
			// 已点赞 → 取消（当天取消后不可再点）
			const r = await cancelTeacherLike(locals.db, locals.user.id, teacherId);
			if (!r.ok) return fail(400, { error: r.error });
			const updated = await getTeacher(locals.db, teacherId);
			return { ok: true, liked: false, likes: updated?.likes ?? teacher.likes };
		}

		// 未投过 → 点赞
		const r = await likeTeacher(locals.db, locals.user.id, teacherId);
		if (!r.ok) return fail(400, { error: r.error });
		const updated = await getTeacher(locals.db, teacherId);
		return { ok: true, liked: true, likes: updated?.likes ?? teacher.likes };
	}
};
