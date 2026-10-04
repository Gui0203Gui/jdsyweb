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
</script>

<svelte:head>
	<title>热门榜 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🔥 热门榜</h1>

<p class="text-secondary mb-16" style="font-size:14px;">按 浏览量 + 回复×3 + 点赞×5 加权热度排序</p>

<ul class="post-list">
	{#each data.posts as row, i (row.post.id)}
		<li class="post-item">
			<div class="post-item-top">
				<span class="rank-no" style="width:26px;height:26px;font-size:13px;">{i + 1}</span>
				{#if row.post.isPinned}<span class="pin-tag">置顶</span>{/if}
				<a href={`/post/${row.post.id}`} class="post-title">{row.post.title}</a>
			</div>
			<div class="post-meta">
				<span
					>{row.author.username}
					{#if row.author.badge}<span class="user-badge">【{row.author.badge}】</span>{/if}</span
				>
				<span>👁 {row.post.views}</span>
				<span>💬 {row.commentCount}</span>
				<span>👍 {row.likeCount}</span>
				<span>{fmtDate(row.post.createdAt)}</span>
			</div>
			{#if row.post.content}
				<div class="post-excerpt" class:badge-speech={row.author.badge}>{row.post.content}</div>
			{/if}
		</li>
	{:else}
		<div class="empty">
			<div class="empty-icon">🔥</div>
			还没有热门帖子
		</div>
	{/each}
</ul>
