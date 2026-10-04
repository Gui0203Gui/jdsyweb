<script lang="ts">
	import { badgeCls, badgeShort } from '#lib/flowers';
	import type { PageProps } from './$types';
	import { formatDateTime } from '#lib/time';
	import { enhance } from '$app/forms';
	import { avatarUrl } from '#lib/avatar';

	let { data, form }: PageProps = $props();
	let replyText = $state('');

	let postImages = $derived(parseImages(data.post.images));
	let postLiked = $state(false);
	// data.favorited 为初始收藏状态；交互后优先用本地覆盖值
	let favoriteOverride = $state<boolean | null>(null);
	let postFavorited = $derived(favoriteOverride ?? data.favorited);

	function parseImages(imagesJson: string): string[] {
		try {
			const arr = JSON.parse(imagesJson || '[]');
			return Array.isArray(arr) ? arr.filter((k) => typeof k === 'string') : [];
		} catch {
			return [];
		}
	}

	function handleLike(result: { liked?: boolean }) {
		if (result.liked !== undefined) postLiked = result.liked;
	}

	function handleFavorite(result: { favorited?: boolean }) {
		if (result.favorited !== undefined) favoriteOverride = result.favorited;
	}
</script>

<svelte:head>
	<title>{data.post.title} - 交大实验网</title>
</svelte:head>

<nav class="mb-16 text-secondary" style="font-size: 14px;">
	<a href="/">首页</a> › <a href={`/forum/${data.forum.slug}`}>{data.forum.name}</a> ›
	<span>{data.post.title}</span>
</nav>

<article class="card">
	<header class="post-detail-header">
		<div class="flex" style="margin-bottom: 8px;">
			{#if data.post.isPinned}
				<span class="pin-tag">置顶</span>
			{/if}
			{#if data.post.isLocked}
				<span class="badge">🔒 已锁定</span>
			{/if}
			<span class="badge">{data.forum.name}</span>
		</div>
		<h1 class="post-detail-title">{data.post.title}</h1>
		<div class="post-meta">
			{#if avatarUrl(data.author.avatar)}
				<span class="avatar" style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
					><img src={avatarUrl(data.author.avatar)} alt={data.author.username} /></span
				>
			{:else}
				<span class="avatar" style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
					>👤</span
				>
			{/if}
			<span
				>{data.author.username}
				{#if data.author.badge}<span class="user-badge badge-{badgeCls(data.author.badge)}"
						>【{badgeShort(data.author.badge)}】</span
					>{/if}</span
			>
			<span>·</span>
			<span>⭐ {data.author.points} 积分</span>
			<span>·</span>
			<span>{formatDateTime(data.post.createdAt)}</span>
			<span>·</span>
			<span>👁 {data.post.views}</span>
		</div>
	</header>

	<div
		class="post-content"
		class:badge-speech={data.author.badge}
		class:badge-cheng={badgeCls(data.author.badge) === 'cheng'}
	>
		{data.post.content}
	</div>

	{#if postImages.length > 0}
		<div class="post-images">
			{#each postImages as key (key)}
				<a href={`/api/img/${key}`} target="_blank">
					<img src={`/api/img/${key}`} alt="帖子图片" class="post-image" loading="lazy" />
				</a>
			{/each}
		</div>
	{/if}

	{#if !data.post.isLocked}
		<div class="post-actions">
			<form method="post" action="?/like" use:enhance>
				<input type="hidden" name="targetType" value="post" />
				<input type="hidden" name="targetId" value={data.post.id} />
				<button type="submit" class="btn btn-ghost btn-sm" data-enhance-on={handleLike}
					>👍 点赞{postLiked ? '（已赞）' : ''}</button
				>
			</form>
			{#if data.user}
				<form method="post" action="?/favorite" use:enhance>
					<input type="hidden" name="postId" value={data.post.id} />
					<button type="submit" class="btn btn-ghost btn-sm" data-enhance-on={handleFavorite}
						>🔖 {postFavorited ? '已收藏' : '收藏'}</button
					>
				</form>
			{/if}
		</div>
	{/if}
</article>

<section class="card mt-16">
	<h2 class="section-title">全部回复（{data.comments.length}）</h2>

	{#if data.comments.length === 0}
		<p class="text-secondary" style="font-size: 14px;">还没有回复，来抢沙发～</p>
	{/if}

	{#each data.comments as item, i (item.comment.id)}
		<div class="comment">
			<div class="comment-head">
				{#if avatarUrl(item.author.avatar)}
					<span class="avatar" style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
						><img src={avatarUrl(item.author.avatar)} alt={item.author.username} /></span
					>
				{:else}
					<span class="avatar" style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
						>👤</span
					>
				{/if}
				<span
					><strong>{item.author.username}</strong>
					{#if item.author.badge}<span class="user-badge badge-{badgeCls(item.author.badge)}"
							>【{badgeShort(item.author.badge)}】</span
						>{/if} ⭐{item.author.points}</span
				>
				<span class="comment-floor">#{i + 1}楼</span>
				<span class="comment-floor">{formatDateTime(item.comment.createdAt)}</span>
			</div>
			<div
				class="comment-body"
				class:badge-speech={item.author.badge}
				class:badge-cheng={badgeCls(item.author.badge) === 'cheng'}
			>
				{item.comment.content}
			</div>
			{#if !data.post.isLocked}
				<form method="post" action="?/like" use:enhance class="mt-8">
					<input type="hidden" name="targetType" value="comment" />
					<input type="hidden" name="targetId" value={item.comment.id} />
					<button type="submit" class="btn btn-ghost btn-sm">👍 {item.likeCount}</button>
				</form>
			{/if}
		</div>
	{/each}
</section>

{#if data.post.isLocked}
	<div class="card mt-16 text-secondary" style="text-align: center;">
		🔒 本贴已锁定，不再接受回复。
	</div>
{:else if data.user}
	<section class="card mt-16">
		<h2 class="section-title">发表回复（+5 积分）</h2>
		{#if form?.error}
			<div class="form-error">{form.error}</div>
		{/if}
		<form method="post" action="?/comment" use:enhance>
			<div class="form-group" style="margin-bottom: 12px;">
				<textarea
					name="content"
					class="form-textarea"
					bind:value={replyText}
					placeholder="友善交流，理性发言……"
					style="min-height: 100px;"
					maxlength="5000"
					required></textarea>
			</div>
			<button type="submit" class="btn btn-primary" disabled={replyText.trim().length === 0}
				>发布回复</button
			>
		</form>
	</section>
{:else}
	<div class="card mt-16 text-secondary" style="text-align: center;">
		<a href="/login">登录</a> 后即可回复
	</div>
{/if}
