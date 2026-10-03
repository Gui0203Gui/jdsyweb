<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
</script>

<svelte:head>
	<title>{data.profile.user.username}的主页 - 交大实验网</title>
</svelte:head>

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
</div>

<div class="card mt-16">
	<h2 class="section-title">📝 发布的帖子</h2>
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
				还没有发过帖子
			</div>
		{/each}
	</ul>
</div>

{#if data.works.length > 0}
	<div class="card mt-16">
		<h2 class="section-title">🎨 作品集</h2>
		<div class="works-grid">
			{#each data.works as row (row.work.id)}
				<a href={`/works/${row.work.id}`} class="work-card">
					<div class="work-card-icon">🖥️</div>
					<div class="work-card-name">{row.work.title}</div>
					<div class="work-card-meta">
						<span>👁 {row.work.views}</span>
						<span>{fmtDate(row.work.createdAt).slice(0, 10)}</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
