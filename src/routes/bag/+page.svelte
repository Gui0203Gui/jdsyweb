<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import type { FlowerType } from '#lib/flowers';
	import { FLOWERS } from '#lib/flowers';

	let { data, form }: PageProps = $props();

	const FLOWER_LIST = Object.values(FLOWERS);

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}

	// 每个道具的赠送表单是否展开
	let sendingId = $state<string | null>(null);
	function toggleSend(id: string) {
		sendingId = sendingId === id ? null : id;
	}
</script>

<svelte:head>
	<title>我的背包 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🎒 我的背包</h1>
<p class="form-hint" style="margin-bottom:16px;">这里存放你的绝版花朵道具，可以送给其他吧友。</p>

{#if form?.success}
	<div class="form-success">{form.success}</div>
{/if}
{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<!-- 各花数量总览 -->
<section class="bag-summary">
	{#each FLOWER_LIST as f (f.key)}
		{@const n = data.counts.find((c) => c.type === f.key)?.n ?? 0}
		<div class="bag-summary-card">
			<img src={f.image} alt={f.name} class="flower-img" />
			<div class="bag-summary-name">
				{f.name} <span class="tag">绝版</span>
			</div>
			<div class="bag-summary-count">× {n}</div>
		</div>
	{/each}
</section>

<!-- 道具明细 -->
<section>
	<h2 class="section-title">🧺 道具明细</h2>
	{#if data.items.length === 0}
		<div class="card empty">
			<div class="empty-icon">🪻</div>
			<p>背包空空如也，快去国庆签到领花吧！</p>
			<div class="mt-16"><a href="/festival" class="btn btn-primary">🎁 去领花</a></div>
		</div>
	{:else}
		<ul class="post-list">
			{#each data.items as it (it.id)}
				<li class="post-item">
					{#if it.info}
						<img src={it.info.image} alt={it.info.name} class="flower-img flower-img-sm" />
					{:else}
						<span class="avatar">🪻</span>
					{/if}
					<div class="teacher-info" style="flex:1;">
						<div class="teacher-name">
							{it.info?.name ?? it.itemType}
							<span class="tag">{it.info?.tag ?? '道具'}</span>
						</div>
						<div class="teacher-desc">
							来源：{it.source === 'festival-signin' ? '🎁 国庆签到' : '💌 好友赠送'} · 获得于 {fmtDate(
								it.createdAt
							)}
						</div>
					</div>
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => toggleSend(it.id)}>
						💌 送人
					</button>
				</li>
				{#if sendingId === it.id}
					<li class="post-item" style="background:var(--surface-2);">
						<form
							method="post"
							action="?/send"
							use:enhance
							class="flex"
							style="gap:8px;width:100%;"
						>
							<input type="hidden" name="itemId" value={it.id} />
							<input
								type="text"
								name="username"
								class="form-input"
								placeholder="接收者的用户名"
								required
								style="max-width:220px;"
							/>
							<button type="submit" class="btn btn-primary btn-sm">确认送出</button>
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => toggleSend(it.id)}>
								取消
							</button>
						</form>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</section>

<style>
	.bag-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
		margin-bottom: 24px;
	}
	.bag-summary-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px;
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
		width: 48px;
		height: 48px;
		margin: 0 12px 0 0;
	}
	.bag-summary-name {
		font-weight: 600;
		font-size: 14px;
	}
	.bag-summary-count {
		color: var(--text-secondary);
		font-size: 13px;
		margin-top: 4px;
	}
	.mt-16 {
		margin-top: 16px;
	}
</style>
