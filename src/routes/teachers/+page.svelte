<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import { avatarUrl } from '#lib/avatar';

	let { data, form }: PageProps = $props();

	let avatarKey = $state('');
	let uploading = $state(false);
	let uploadError = $state('');

	async function handleFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowed.includes(file.type)) {
			uploadError = '仅支持 JPG/PNG/GIF/WebP 图片';
			input.value = '';
			return;
		}

		uploading = true;
		uploadError = '';
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			const result: { key?: string; error?: string } = await res.json();
			if (res.ok && result?.key) {
				avatarKey = result.key;
			} else {
				uploadError = result?.error || '图片上传失败';
			}
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function isLiked(teacherId: string) {
		return data.likedIds.includes(teacherId);
	}
</script>

<svelte:head>
	<title>老师评分排行榜 - 交大实验网</title>
</svelte:head>

<div class="flex-between mb-16">
	<h1 class="page-title" style="margin-bottom: 0;">👨‍🏫 老师评分排行榜</h1>
	{#if data.user}
		<a href="#upload" class="btn btn-primary btn-sm">上传老师</a>
	{/if}
</div>

<p class="form-hint" style="margin-bottom:16px;">
	为喜欢的老师点赞，让好老师被更多人看到。每位老师需要管理员审核通过后才会出现在榜单上。
</p>

{#if data.user}
	<div class="card mb-16" id="upload">
		<h2 class="section-title">📤 上传老师</h2>
		{#if form?.ok}
			<div class="form-success">
				已收到「{form.name}」的提交，等待管理员审核通过后即可上榜。
			</div>
		{/if}
		{#if form?.error}
			<div class="form-error">{form.error}</div>
		{/if}
		{#if uploadError}
			<div class="form-error">{uploadError}</div>
		{/if}

		<form method="post" action="?/submit" use:enhance>
			<div class="form-group">
				<label class="form-label" for="name">老师姓名</label>
				<input
					type="text"
					name="name"
					id="name"
					class="form-input"
					placeholder="例如：王建国"
					maxlength="30"
					required
				/>
			</div>

			<div class="form-group">
				<label class="form-label" for="description">简介（可选）</label>
				<input
					type="text"
					name="description"
					id="description"
					class="form-input"
					placeholder="例如：数学老师，讲课超清楚"
					maxlength="200"
				/>
			</div>

			<div class="form-group">
				<label class="form-label" for="avatar">老师照片（可选，建议上传）</label>
				<input
					type="file"
					id="avatar"
					accept="image/jpeg,image/png,image/gif,image/webp"
					onchange={handleFile}
					disabled={uploading}
				/>
				{#if uploading}
					<p class="form-hint">上传中……</p>
				{/if}
				{#if avatarKey}
					<div class="upload-preview-list">
						<div class="upload-preview-item">
							<img src={`/api/img/${avatarKey}`} alt="预览" class="upload-preview-img" />
							<button
								type="button"
								class="upload-remove"
								onclick={() => (avatarKey = '')}
								aria-label="移除图片">×</button
							>
						</div>
					</div>
					<input type="hidden" name="avatar" value={avatarKey} />
				{/if}
			</div>

			<button type="submit" class="btn btn-primary" disabled={uploading}>提交审核</button>
		</form>
	</div>
{:else}
	<div class="card empty mb-16">
		<div class="empty-icon">🔒</div>
		<p>登录后可以上传老师并为老师点赞</p>
		<div class="mt-16">
			<a href="/login" class="btn btn-primary">登录</a>
			<a href="/register" class="btn btn-ghost">注册</a>
		</div>
	</div>
{/if}

<section>
	<h2 class="section-title">🏆 排行榜</h2>
	{#if data.teachers.length === 0}
		<div class="card empty">
			<div class="empty-icon">👨‍🏫</div>
			<p>还没有老师上榜，来上传第一位吧！</p>
		</div>
	{:else}
		<ul class="post-list">
			{#each data.teachers as teacher, i (teacher.id)}
				<li class="post-item">
					<div class="teacher-row">
						<span class="teacher-rank">{i + 1 + (data.page - 1) * 20}</span>
						{#if avatarUrl(teacher.avatar)}
							<span class="avatar teacher-avatar"
								><img src={avatarUrl(teacher.avatar)} alt={teacher.name} /></span
							>
						{:else}
							<span class="avatar teacher-avatar">🧑‍🏫</span>
						{/if}
						<div class="teacher-info">
							<div class="teacher-name">{teacher.name}</div>
							{#if teacher.description}
								<div class="teacher-desc">{teacher.description}</div>
							{/if}
						</div>
						<span class="teacher-likes">👍 {teacher.likes}</span>
						{#if data.user}
							<form method="post" action="?/like" use:enhance>
								<input type="hidden" name="teacherId" value={teacher.id} />
								<button
									type="submit"
									class="btn btn-sm {isLiked(teacher.id) ? 'btn-primary' : 'btn-ghost'}"
								>
									{isLiked(teacher.id) ? '已点赞' : '👍 点赞'}
								</button>
								{#if form?.error && form?.error.includes('今天')}
									<div class="form-error like-err">{form.error}</div>
								{/if}
							</form>
						{:else}
							<a href="/login" class="btn btn-ghost btn-sm">登录点赞</a>
						{/if}
					</div>
				</li>
			{/each}
		</ul>

		{#if data.pageCount > 1}
			<nav class="pagination">
				{#if data.page > 1}
					<a class="page-link" href={`/teachers?page=${data.page - 1}`}>← 上一页</a>
				{/if}
				<span class="page-info">第 {data.page} / {data.pageCount} 页</span>
				{#if data.page < data.pageCount}
					<a class="page-link" href={`/teachers?page=${data.page + 1}`}>下一页 →</a>
				{/if}
			</nav>
		{/if}
	{/if}
</section>

<style>
	.teacher-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.teacher-rank {
		font-weight: 700;
		color: var(--text-secondary);
		min-width: 24px;
	}
	.teacher-avatar {
		width: 44px;
		height: 44px;
		font-size: 22px;
		flex-shrink: 0;
	}
	.teacher-info {
		flex: 1;
		min-width: 0;
	}
	.teacher-name {
		font-weight: 600;
		font-size: 15px;
	}
	.teacher-desc {
		color: var(--text-secondary);
		font-size: 13px;
		margin-top: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.teacher-likes {
		font-weight: 600;
		color: var(--accent, #2f7d5c);
		white-space: nowrap;
	}
	.like-err {
		margin-top: 6px;
		max-width: 180px;
	}
</style>
