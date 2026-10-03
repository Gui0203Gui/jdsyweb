<script lang="ts">
	import type { PageProps } from './$types';
	import { formatDateTime } from '#lib/time';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();
	let replyText = $state('');
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
			<span>{data.author.avatar || '👤'} {data.author.username}</span>
			<span>·</span>
			<span>{formatDateTime(data.post.createdAt)}</span>
			<span>·</span>
			<span>👁 {data.post.views}</span>
		</div>
	</header>

	<div class="post-content">{data.post.content}</div>

	{#if !data.post.isLocked}
		<form method="post" action="?/like" use:enhance>
			<input type="hidden" name="targetType" value="post" />
			<input type="hidden" name="targetId" value={data.post.id} />
			<button type="submit" class="btn btn-ghost btn-sm">👍 点赞</button>
		</form>
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
				<span>{item.author.avatar || '👤'} <strong>{item.author.username}</strong></span>
				<span class="comment-floor">#{i + 1}楼</span>
				<span class="comment-floor">{formatDateTime(item.comment.createdAt)}</span>
			</div>
			<div class="comment-body">{item.comment.content}</div>
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
		<h2 class="section-title">发表回复</h2>
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
