/**
 * 头像 key -> 可访问 URL。
 * users.avatar 存的是 KV key（形如 `img/avatar-<userId>.<ext>`），
 * 图片读取路由是 /api/img/[...key]，因此需拼成 `/api/img/${key}`。
 * 无头像时返回 null，由调用方渲染 👤 占位。
 */
export function avatarUrl(key?: string | null): string | null {
	if (!key) return null;
	return `/api/img/${key}`;
}
