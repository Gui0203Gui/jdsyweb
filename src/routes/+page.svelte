<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelativeTime } from '#lib/time';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>交大实验网 - 首页</title>
</svelte:head>

<div class="flex-between mb-16">
	<h1 class="page-title" style="margin-bottom: 0;">🧪 交大实验网</h1>
	{#if data.posts.length === 0}
		<span class="badge">暂无帖子</span>
	{/if}
</div>

{#if data.forums.length > 0}
	<section class="mb-16">
		<h2 class="section-title">板块导航</h2>
		<div class="forum-grid">
			{#each data.forums as forum (forum.id)}
				<a href={`/forum/${forum.slug}`} class="forum-card">
					<div class="forum-card-icon">{forum.icon}</div>
					<div class="forum-card-name">{forum.name}</div>
					<div class="forum-card-desc">{forum.description || '暂无简介'}</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<section>
	<h2 class="section-title">最新帖子</h2>
	{#if data.posts.length === 0}
		<div class="card empty">
			<div class="empty-icon">🌱</div>
			<p>还没有帖子，来发第一帖吧！</p>
			{#if data.user}
				<div class="mt-16">
					<a href="/post/new" class="btn btn-primary">发帖</a>
				</div>
			{:else}
				<div class="mt-16">
					<a href="/register" class="btn btn-primary">注册后发帖</a>
				</div>
			{/if}
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
						<span>{item.author.avatar || '👤'} {item.author.username}</span>
						<span>·</span>
						<span>{formatRelativeTime(item.post.createdAt)}</span>
						<span>·</span>
						<span>💬 {item.commentCount}</span>
						<span>👍 {item.likeCount}</span>
						<span>·</span>
						<span>👁 {item.post.views}</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
