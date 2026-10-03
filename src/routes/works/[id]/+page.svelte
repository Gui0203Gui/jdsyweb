<script lang="ts">
	import type { PageProps } from './$types';
	import { formatDateTime } from '#lib/time';
	import { avatarUrl } from '#lib/avatar';

	let { data }: PageProps = $props();
	let showPreview = $state(true);

	let previewUrl = $derived(`/api/work/${data.work.id}/preview`);
	let downloadUrl = $derived(`/api/work/${data.work.id}/download`);
	let fileSizeKb = $derived((data.work.fileSize / 1024).toFixed(1));
</script>

<svelte:head>
	<title>{data.work.title} - 作品集</title>
</svelte:head>

<nav class="mb-16 text-secondary" style="font-size: 14px;">
	<a href="/">首页</a> › <a href="/works">作品集</a> › <span>{data.work.title}</span>
</nav>

<article class="card">
	<header class="post-detail-header">
		<h1 class="post-detail-title">🖼️ {data.work.title}</h1>
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
			<span>{data.author.username} ⭐{data.author.points}</span>
			<span>·</span>
			<span>📄 {data.work.fileName}</span>
			<span>·</span>
			<span>📦 {fileSizeKb} KB</span>
			<span>·</span>
			<span>👁 {data.work.views}</span>
			<span>·</span>
			<span>{formatDateTime(data.work.createdAt)}</span>
		</div>
	</header>

	{#if data.work.description}
		<div class="post-content mb-16">{data.work.description}</div>
	{/if}

	<div class="work-actions mb-16">
		<button type="button" class="btn btn-ghost btn-sm" onclick={() => (showPreview = !showPreview)}
			>{showPreview ? '隐藏预览' : '显示预览'}</button
		>
		<a href={downloadUrl} class="btn btn-primary btn-sm" download>⬇️ 下载文件</a>
	</div>
</article>

{#if showPreview}
	<section class="card mt-16">
		<h2 class="section-title">在线预览</h2>
		<div class="preview-frame">
			<iframe src={previewUrl} title="作品预览" sandbox="allow-scripts" loading="lazy"></iframe>
		</div>
		<p class="form-hint mt-8">预览运行在沙箱环境中（脚本可用，但无法访问本站数据），仅供体验。</p>
	</section>
{/if}
