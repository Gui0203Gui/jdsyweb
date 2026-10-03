<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelativeTime } from '#lib/time';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>作品集 - 交大实验网</title>
</svelte:head>

<div class="flex-between mb-16">
	<h1 class="page-title" style="margin-bottom: 0;">🎨 作品集</h1>
	{#if data.works.length > 0}
		<a href="/works/new" class="btn btn-primary btn-sm">上传作品</a>
	{/if}
</div>

{#if data.works.length === 0}
	<div class="card empty">
		<div class="empty-icon">🎨</div>
		<p>还没有作品，来上传第一个 HTML 作品吧！</p>
		{#if data.user}
			<div class="mt-16">
				<a href="/works/new" class="btn btn-primary">上传作品</a>
			</div>
		{:else}
			<div class="mt-16">
				<a href="/register" class="btn btn-primary">注册后上传</a>
			</div>
		{/if}
	</div>
{:else}
	<div class="works-grid">
		{#each data.works as item (item.work.id)}
			<a href={`/works/${item.work.id}`} class="work-card">
				<div class="work-card-icon">🖼️</div>
				<div class="work-card-name">{item.work.title}</div>
				{#if item.work.description}
					<div class="work-card-desc">{item.work.description}</div>
				{/if}
				<div class="work-card-meta">
					<span>👤 {item.author.username}</span>
					<span>·</span>
					<span>👁 {item.work.views}</span>
					<span>·</span>
					<span>{formatRelativeTime(item.work.createdAt)}</span>
				</div>
			</a>
		{/each}
	</div>
{/if}
