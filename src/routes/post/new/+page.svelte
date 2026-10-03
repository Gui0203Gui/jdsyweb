<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>发帖 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">📝 发布新帖</h1>

<div class="card">
	{#if form?.error}
		<div class="form-error">{form.error}</div>
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
			<p class="form-hint">友善交流，理性发言。发布即代表你同意社区规范。</p>
		</div>

		<button type="submit" class="btn btn-primary">发布</button>
	</form>
</div>
