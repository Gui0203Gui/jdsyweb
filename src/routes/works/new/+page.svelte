<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>上传作品 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🎨 上传 HTML 作品</h1>

<div class="card">
	{#if form?.error}
		<div class="form-error">{form.error}</div>
	{/if}

	<form method="post" use:enhance enctype="multipart/form-data">
		<div class="form-group">
			<label class="form-label" for="title">作品标题</label>
			<input
				type="text"
				name="title"
				id="title"
				class="form-input"
				placeholder="给你的作品起个名字"
				maxlength="60"
				required
			/>
		</div>

		<div class="form-group">
			<label class="form-label" for="description">作品简介（可选）</label>
			<textarea
				name="description"
				id="description"
				class="form-textarea"
				placeholder="简单介绍这个作品的亮点……"
				maxlength="500"
				style="min-height: 80px;"></textarea>
		</div>

		<div class="form-group">
			<label class="form-label" for="file">HTML 文件</label>
			<input type="file" name="file" id="file" accept=".html,.htm" required />
			<p class="form-hint">支持 .html / .htm 文件。上传后可在线预览和下载。</p>
		</div>

		<button type="submit" class="btn btn-primary">上传作品（+20 积分）</button>
	</form>
</div>
