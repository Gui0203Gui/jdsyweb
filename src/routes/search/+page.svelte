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
	<title>搜索 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🔍 搜索</h1>

<form action="/search" method="get" class="flex" style="margin-bottom:16px;">
	<input
		type="search"
		name="q"
		value={data.keyword}
		class="form-input"
		placeholder="搜索帖子标题或内容…"
		style="max-width:420px;"
	/>
	<button type="submit" class="btn btn-primary btn-sm">搜索</button>
</form>

{#if data.keyword}
	<p class="text-secondary mb-16" style="font-size:14px;">
		共找到 <b>{data.total}</b> 条与「{data.keyword}」相关的帖子
	</p>

	<ul class="post-list">
		{#each data.posts as row (row.post.id)}
			<li class="post-item">
				<div class="post-item-top">
					{#if row.post.isPinned}<span class="pin-tag">置顶</span>{/if}
					<a href={`/post/${row.post.id}`} class="post-title">{row.post.title}</a>
				</div>
				<div class="post-meta">
					<span
						>{row.author.username}
						{#if row.author.badge}<span class="user-badge">【{row.author.badge}】</span>{/if}</span
					>
					<span>💬 {row.commentCount}</span>
					<span>👍 {row.likeCount}</span>
					<span>👁 {row.post.views}</span>
					<span>{fmtDate(row.post.createdAt)}</span>
				</div>
				{#if row.post.content}
					<div class="post-excerpt" class:badge-speech={row.author.badge}>{row.post.content}</div>
				{/if}
			</li>
		{:else}
			<div class="empty">
				<div class="empty-icon">🤔</div>
				没有找到相关帖子
			</div>
		{/each}
	</ul>

	{#if data.pageCount > 1}
		<nav class="pagination">
			{#if data.page > 1}
				<a
					class="page-link"
					href={`/search?q=${encodeURIComponent(data.keyword)}&page=${data.page - 1}`}
				>
					← 上一页
				</a>
			{/if}
			<span class="page-info">第 {data.page} / {data.pageCount} 页</span>
			{#if data.page < data.pageCount}
				<a
					class="page-link"
					href={`/search?q=${encodeURIComponent(data.keyword)}&page=${data.page + 1}`}
				>
					下一页 →
				</a>
			{/if}
		</nav>
	{/if}
{:else}
	<div class="empty">
		<div class="empty-icon">🔍</div>
		输入关键词，搜索帖子标题和内容
	</div>
{/if}
