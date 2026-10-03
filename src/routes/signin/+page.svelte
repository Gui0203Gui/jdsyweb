<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>签到 - 交大实验网</title>
</svelte:head>

<div class="card empty">
	<div class="empty-icon">📅</div>
	<h2 class="section-title">每日签到</h2>
	<p>每天签到可获得 5 积分。连续坚持，积分越来越多～</p>

	{#if form?.error}
		<div class="form-error mt-16" style="text-align: left;">{form.error}</div>
	{/if}
	{#if form?.signed}
		<div class="form-hint mt-16" style="text-align: center; font-size: 15px;">
			✅ 签到成功，积分 +5
		</div>
	{/if}
	{#if form?.ok && !form?.signed}
		<div class="form-hint mt-16" style="text-align: center; font-size: 15px;">
			📅 今天已经签过到啦，明天再来！
		</div>
	{/if}

	<form method="post" use:enhance class="mt-16">
		<button type="submit" class="btn btn-primary">立即签到（+5 积分）</button>
	</form>
</div>
