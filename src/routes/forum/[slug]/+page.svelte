<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelativeTime } from '#lib/time';
	import { avatarUrl } from '#lib/avatar';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.forum.name} - 交大实验网</title>
</svelte:head>

<div class="flex-between mb-16">
	<div>
		<h1 class="page-title" style="margin-bottom: 4px;">
			{data.forum.icon}
			{data.forum.name}
		</h1>
		{#if data.forum.description}
			<p class="text-secondary" style="font-size: 14px;">{data.forum.description}</p>
		{/if}
	</div>
	<a href="/post/new" class="btn btn-primary">发帖</a>
</div>

{#if data.posts.length === 0}
	<div class="card empty">
		<div class="empty-icon">🕸️</div>
		<p>这个板块还没有帖子，快来抢占第一楼！</p>
		<div class="mt-16">
			<a href="/post/new" class="btn btn-primary">发帖</a>
		</div>
	</div>
{:else}
	<ul class="post-list">
		{#each data.posts as item (item.post.id)}
			<li class="post-item">
				<div class="post-item-top">
					{#if item.post.isPinned}
						<span class="pin-tag">置顶</span>
					{/if}
					<a href={`/post/${item.post.id}`} class="post-title">{item.post.title}</a>
				</div>
				<div class="post-meta">
					{#if avatarUrl(item.author.avatar)}
						<span class="avatar" style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
							><img src={avatarUrl(item.author.avatar)} alt={item.author.username} /></span
						>
					{:else}
						<span class="avatar" style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
							>👤</span
						>
					{/if}
					<span>{item.author.username} ⭐{item.author.points}</span>
					<span>·</span>
					<span>{formatRelativeTime(item.post.createdAt)}</span>
					<span>·</span>
					<span>💬 {item.commentCount}</span>
					<span>👍 {item.likeCount}</span>
					<span>·</span>
					<span>👁 {item.post.views}</span>
				</div>
				{#if item.post.content}
					<p class="post-excerpt">{item.post.content}</p>
				{/if}
			</li>
		{/each}
	</ul>

	{#if data.pageCount > 1}
		<nav class="pagination">
			{#if data.page > 1}
				<a class="page-link" href={`/forum/${data.forum.slug}?page=${data.page - 1}`}>← 上一页</a>
			{/if}
			<span class="page-info">第 {data.page} / {data.pageCount} 页</span>
			{#if data.page < data.pageCount}
				<a class="page-link" href={`/forum/${data.forum.slug}?page=${data.page + 1}`}>下一页 →</a>
			{/if}
		</nav>
	{/if}
{/if}
