<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data }: PageProps = $props();

	const REASONS: Record<string, string> = {
		post: '发帖',
		comment: '评论',
		like: '点赞',
		favorite: '收藏',
		signin: '签到',
		work: '上传作品'
	};

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
			d.getMinutes()
		)}`;
	}

	function avatarUrl(key: string): string {
		return key ? `/api/img/${key}` : '';
	}

	let avatarMsg = $state('');

	async function uploadAvatar(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		avatarMsg = '';
		const fd = new FormData();
		fd.append('file', file);
		try {
			const res = await fetch('/api/avatar', { method: 'POST', body: fd });
			const body = (await res.json()) as { error?: string };
			if (!res.ok) {
				avatarMsg = body.error ?? '上传失败';
			} else {
				avatarMsg = '头像已更新，刷新后生效';
			}
		} catch {
			avatarMsg = '上传失败，请稍后再试';
		}
		input.value = '';
	}
</script>

<svelte:head>
	<title>我的主页 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">👤 我的主页</h1>

<div class="card">
	<div class="profile-card">
		{#if avatarUrl(data.profile.user.avatar)}
			<div class="profile-avatar">
				<img src={avatarUrl(data.profile.user.avatar)} alt="头像" />
			</div>
		{:else}
			<div class="profile-avatar">👤</div>
		{/if}
		<div class="profile-info">
			<div class="profile-name">
				{data.profile.user.username}
				{#if data.profile.user.role === 'admin'}
					<span class="tag admin" style="margin-left:8px;">管理员</span>
				{/if}
			</div>
			<div class="profile-meta">
				<span>📅 注册于 {fmtDate(data.profile.user.createdAt).slice(0, 10)}</span>
				<span>⭐ 积分 {data.profile.user.points}</span>
			</div>
			{#if data.profile.user.bio}
				<div class="profile-bio">{data.profile.user.bio}</div>
			{/if}
			<div class="profile-stats">
				<div class="profile-stat"><b>{data.profile.postCount}</b><span>帖子</span></div>
				<div class="profile-stat"><b>{data.profile.commentCount}</b><span>评论</span></div>
				<div class="profile-stat"><b>{data.profile.workCount}</b><span>作品</span></div>
			</div>
		</div>
	</div>

	<div class="mt-16 flex" style="flex-wrap:wrap;gap:16px;">
		<div>
			<label class="form-label" for="avatar">更换头像（JPG/PNG/GIF/WebP）</label>
			<input type="file" id="avatar" accept="image/*" onchange={uploadAvatar} />
			{#if avatarMsg}<p class="form-hint">{avatarMsg}</p>{/if}
		</div>
		<form method="post" action="?/updateBio" use:enhance style="flex:1;min-width:220px;">
			<label class="form-label" for="bio">个人简介（可选）</label>
			<div class="flex" style="gap:8px;">
				<input
					type="text"
					id="bio"
					name="bio"
					class="form-input"
					maxlength="200"
					placeholder="写一句话介绍自己…"
					value={data.profile.user.bio}
				/>
				<button type="submit" class="btn btn-ghost btn-sm" style="white-space:nowrap;">保存</button>
			</div>
		</form>
	</div>
</div>

<div class="card mt-16">
	<h2 class="section-title">📝 我的帖子</h2>
	<ul class="post-list">
		{#each data.posts as row (row.post.id)}
			<li class="post-item">
				<div class="post-item-top">
					{#if row.post.isPinned}<span class="pin-tag">置顶</span>{/if}
					<a href={`/post/${row.post.id}`} class="post-title">{row.post.title}</a>
				</div>
				<div class="post-meta">
					<span>💬 {row.commentCount}</span>
					<span>👍 {row.likeCount}</span>
					<span>👁 {row.post.views}</span>
					<span>{fmtDate(row.post.createdAt)}</span>
				</div>
			</li>
		{:else}
			<div class="empty">
				<div class="empty-icon">📭</div>
				还没有发过帖子，去发一帖吧！
			</div>
		{/each}
	</ul>
</div>

<div class="card mt-16">
	<h2 class="section-title">⭐ 我的收藏</h2>
	<ul class="post-list">
		{#each data.favorites as row (row.post.id)}
			<li class="post-item">
				<div class="post-item-top">
					<span class="badge">{row.forum.name}</span>
					<a href={`/post/${row.post.id}`} class="post-title">{row.post.title}</a>
				</div>
				<div class="post-meta">
					<span>作者：{row.author.username}</span>
					<span>💬 {row.commentCount}</span>
				</div>
			</li>
		{:else}
			<div class="empty">
				<div class="empty-icon">🔖</div>
				还没有收藏任何帖子
			</div>
		{/each}
	</ul>
</div>

<div class="card mt-16">
	<h2 class="section-title">💰 积分明细</h2>
	<table class="admin-table">
		<thead>
			<tr>
				<th>时间</th>
				<th>原因</th>
				<th>变动</th>
			</tr>
		</thead>
		<tbody>
			{#each data.pointLogs as log (log.id)}
				<tr>
					<td>{fmtDate(log.createdAt)}</td>
					<td>{REASONS[log.reason] ?? log.reason}</td>
					<td style="font-weight:700;color:{log.change >= 0 ? '#16a34a' : 'var(--danger)'};">
						{log.change >= 0 ? '+' : ''}{log.change}
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" style="text-align:center;color:var(--text-secondary);padding:16px;">
						暂无积分记录
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
