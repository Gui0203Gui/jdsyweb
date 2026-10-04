<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import { FLOWERS } from '#lib/flowers';

	let { data, form }: PageProps = $props();

	const FLOWER_LIST = Object.values(FLOWERS);
</script>

<svelte:head>
	<title>国庆签到领花 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🎁 国庆签到 · 随机领花</h1>

<!-- 活动横幅 -->
<section class="festival-banner">
	<div class="festival-title">🇨🇳 国庆假期限定活动</div>
	<div class="festival-dates">
		📅 {data.festivalStart} — {data.festivalEnd}（每天可领一次，随机三种花之一）
	</div>
	{#if data.day >= 1}
		<div class="festival-day">国庆假期第 {data.day} 天 · 今天 {data.date}</div>
	{:else if data.day === 0}
		<div class="festival-day">活动尚未开始，敬请期待！</div>
	{:else}
		<div class="festival-day">活动已结束，感谢参与 🎉</div>
	{/if}
</section>

{#if form?.success}
	<div class="form-success">{form.success}</div>
{/if}
{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<!-- 三种花展示 -->
<section>
	<h2 class="section-title">🌷 三种绝版花朵</h2>
	<div class="flower-grid">
		{#each FLOWER_LIST as f (f.key)}
			<div class="flower-card">
				<img src={f.image} alt={f.name} class="flower-img" />
				<div class="flower-name">
					{f.name} <span class="tag">绝版</span>
				</div>
				<div class="flower-desc">我的世界官方贴图 · 活动结束后不再产出</div>
			</div>
		{/each}
	</div>
</section>

<!-- 今日领取 -->
<section>
	<h2 class="section-title">📮 今日领取</h2>
	{#if !data.open}
		<div class="card empty">
			<div class="empty-icon">⏳</div>
			<p>活动未在进行中</p>
		</div>
	{:else if data.claimedToday}
		<div class="card claimed">
			<div class="claimed-icon">✅</div>
			<p>今天已经领过啦！你得到的是</p>
			<div class="claimed-flower">
				<img src={data.claimedToday.image} alt={data.claimedToday.name} class="flower-img" />
				<span class="flower-name">{data.claimedToday.name}</span>
			</div>
			<p class="form-hint">明天再来，还有机会集齐另外两种！</p>
		</div>
	{:else}
		<form method="post" action="?/claim" use:enhance>
			<button type="submit" class="btn btn-primary btn-lg">🌸 今日领取一朵花（随机）</button>
		</form>
		<p class="form-hint" style="margin-top:8px;">
			每天一次机会，随机获得虞美人 / 矢车菊 / 蒲公英 之一。
		</p>
	{/if}
</section>

<!-- 我的收获 -->
<section>
	<h2 class="section-title">📚 我的收获（共 {data.claims.length} 天）</h2>
	{#if data.claims.length === 0}
		<div class="card empty">
			<div class="empty-icon">🪻</div>
			<p>还没有领过花，快去领取吧！</p>
		</div>
	{:else}
		<ul class="post-list">
			{#each data.claims as c (c.date)}
				<li class="post-item">
					{#if c.info}
						<img src={c.info.image} alt={c.info.name} class="flower-img flower-img-sm" />
						<span class="teacher-name">{c.info.name}</span>
					{:else}
						<span class="avatar">🪻</span>
						<span class="teacher-name">未知</span>
					{/if}
					<span class="teacher-desc">领于 {c.date}</span>
					<a href="/bag" class="btn btn-ghost btn-sm">🎒 看背包</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.festival-banner {
		background: linear-gradient(135deg, #e63946, #d62828);
		color: #fff;
		border-radius: 14px;
		padding: 22px 24px;
		margin-bottom: 20px;
	}
	.festival-title {
		font-size: 22px;
		font-weight: 700;
	}
	.festival-dates {
		font-size: 14px;
		opacity: 0.92;
		margin-top: 6px;
	}
	.festival-day {
		font-size: 13px;
		opacity: 0.85;
		margin-top: 8px;
		background: rgba(255, 255, 255, 0.15);
		display: inline-block;
		padding: 4px 12px;
		border-radius: 999px;
	}
	.flower-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 14px;
	}
	.flower-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 18px 12px;
		text-align: center;
	}
	.flower-img {
		width: 96px;
		height: 96px;
		image-rendering: pixelated;
		margin: 0 auto 8px;
		display: block;
	}
	.flower-img-sm {
		width: 40px;
		height: 40px;
		margin: 0 12px 0 0;
	}
	.flower-name {
		font-weight: 600;
		font-size: 15px;
	}
	.flower-desc {
		color: var(--text-secondary);
		font-size: 12px;
		margin-top: 6px;
	}
	.claimed {
		text-align: center;
		padding: 20px;
	}
	.claimed-icon {
		font-size: 32px;
	}
	.claimed-flower {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin: 10px 0;
	}
	.btn-lg {
		padding: 12px 28px;
		font-size: 16px;
	}
</style>
