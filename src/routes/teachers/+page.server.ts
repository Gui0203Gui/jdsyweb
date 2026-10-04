import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	countApprovedTeachers,
	createTeacher,
	getTeacher,
	likedTeacherIds,
	listTeachers,
	toggleTeacherLike
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

	/** 老师点赞（每人每师一次，可取消） */
	like: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });
		const form = await request.formData();
		const teacherId = String(form.get('teacherId') ?? '');
		if (!teacherId) return fail(400, { error: '缺少老师 ID' });

		const teacher = await getTeacher(locals.db, teacherId);
		if (!teacher || teacher.status !== 'approved') {
			return fail(404, { error: '老师不存在或未通过审核' });
		}

		const { liked } = await toggleTeacherLike(locals.db, locals.user.id, teacherId);
		const updated = await getTeacher(locals.db, teacherId);
		return { ok: true, liked, likes: updated?.likes ?? teacher.likes };
	}
};
