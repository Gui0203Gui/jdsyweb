<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();

	let imageKeys = $state<string[]>([]);
	let uploading = $state(false);
	let uploadError = $state('');

	async function handleFiles(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;

		const remaining = 50 - imageKeys.length;
		if (files.length > remaining) {
			uploadError = `最多还能上传 ${remaining} 张图片`;
			input.value = '';
			return;
		}

		uploading = true;
		uploadError = '';
		const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

		try {
			for (const file of files) {
				if (!allowed.includes(file.type)) {
					uploadError = `"${file.name}" 不是支持的图片格式（仅 JPG/PNG/GIF/WebP）`;
					continue;
				}
				const fd = new FormData();
				fd.append('file', file);
				const res = await fetch('/api/upload', { method: 'POST', body: fd });
				const result: { key?: string; error?: string } = await res.json();
				if (res.ok && result?.key) {
					imageKeys = [...imageKeys, result.key];
				} else {
					uploadError = result?.error || `"${file.name}" 上传失败`;
				}
			}
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function removeImage(key: string) {
		imageKeys = imageKeys.filter((k) => k !== key);
	}
</script>

<svelte:head>
	<title>发帖 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">📝 发布新帖</h1>

<div class="card">
	{#if form?.error}
		<div class="form-error">{form.error}</div>
	{/if}
	{#if uploadError}
		<div class="form-error">{uploadError}</div>
	{/if}

	<form method="post" use:enhance>
		<div class="form-group">
			<label class="form-label" for="forumId">板块</label>
			<select name="forumId" id="forumId" class="form-select" required>
				<option value="" disabled selected>请选择板块</option>
				{#each data.forums as forum (forum.id)}
					<option value={forum.id}>{forum.icon} {forum.name}</option>
				{/each}
			</select>
		</div>

		<div class="form-group">
			<label class="form-label" for="title">标题</label>
			<input
				type="text"
				name="title"
				id="title"
				class="form-input"
				placeholder="一句话说清你的主题"
				maxlength="80"
				required
			/>
		</div>

		<div class="form-group">
			<label class="form-label" for="content">内容</label>
			<textarea
				name="content"
				id="content"
				class="form-textarea"
				placeholder="详细描述……"
				maxlength="20000"
				required></textarea>
		</div>

		<div class="form-group">
			<label class="form-label" for="images">图片（可选，最多 50 张，支持 JPG/PNG/GIF/WebP）</label>
			<input
				type="file"
				id="images"
				accept="image/jpeg,image/png,image/gif,image/webp"
				multiple
				onchange={handleFiles}
				disabled={uploading || imageKeys.length >= 50}
			/>
			{#if uploading}
				<p class="form-hint">上传中……</p>
			{/if}
			{#if imageKeys.length > 0}
				<div class="upload-preview-list">
					{#each imageKeys as key (key)}
						<div class="upload-preview-item">
							<img src={`/api/img/${key}`} alt="预览" class="upload-preview-img" />
							<button
								type="button"
								class="upload-remove"
								onclick={() => removeImage(key)}
								aria-label="移除图片">×</button
							>
						</div>
					{/each}
				</div>
				<input type="hidden" name="images" value={imageKeys.join(',')} />
			{/if}
			<p class="form-hint">友善交流，理性发言。发布即代表你同意社区规范。</p>
		</div>

		<button type="submit" class="btn btn-primary" disabled={uploading}>发布</button>
	</form>
</div>
