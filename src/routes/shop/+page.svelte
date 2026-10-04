<script lang="ts">
	import type { PageProps } from './$types';
	import { FLOWERS, type FlowerType } from '#lib/flowers';

	let { data, form }: PageProps = $props();

	const FLOWER_LIST = Object.values(FLOWERS);
	const price = 25;

	const nOf = $derived((t: string) => data.counts[t] ?? 0);
	const canCraft = $derived(
		!data.badge &&
			nOf('flower:poppy') >= 1 &&
			nOf('flower:cornflower') >= 1 &&
			nOf('flower:dandelion') >= 1
	);
	const canBuy = $derived(data.points >= price);
</script>

<svelte:head>
	<title>商店 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🛒 商店</h1>
<p class="form-hint" style="margin-bottom:16px;">
	用花朵和积分兑换稀有道具。积分可通过发帖（+10）、评论（+5）、点赞（+2）、收藏（+3）、签到（+5）、上传作品（+20）获得。
</p>

{#if form?.success}
	<div class="form-success">{form.success}</div>
{/if}
{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<!-- 我的资源 -->
<section class="wallet">
	<div class="wallet-item">
		<span class="wallet-label">⭐ 积分</span>
		<span class="wallet-value">{data.points}</span>
	</div>
	<div class="wallet-item">
		<span class="wallet-label">💐 虞美人</span>
		<span class="wallet-value">{nOf('flower:poppy')}</span>
	</div>
	<div class="wallet-item">
		<span class="wallet-label">🌾 矢车菊</span>
		<span class="wallet-value">{nOf('flower:cornflower')}</span>
	</div>
	<div class="wallet-item">
		<span class="wallet-label">🌼 蒲公英</span>
		<span class="wallet-value">{nOf('flower:dandelion')}</span>
	</div>
	<div class="wallet-item">
		<span class="wallet-label">🏅 称号</span>
		<span class="wallet-value">
			{#if data.badge}
				<span class="user-badge">【{data.badge}】</span>
			{:else}
				暂无
			{/if}
		</span>
	</div>
</section>

<!-- 交易①：合成称号 -->
<section class="card trade-card">
	<div class="trade-head">
		<div class="trade-title">🏅 合成称号【国庆快乐】</div>
		<div class="trade-sub">装备后：名字后方显示红色加粗称号，所有发言文字变为红色黑框</div>
	</div>
	<div class="trade-recipe">
		{#each ['flower:poppy', 'flower:cornflower', 'flower:dandelion'] as t (t)}
			<div class="recipe-item" class:recipe-missing={nOf(t) < 1}>
				<img src={FLOWERS[t as FlowerType]?.image} alt={FLOWERS[t as FlowerType]?.name} />
				<span>{FLOWERS[t as FlowerType]?.name}</span>
				<span class="recipe-count" class:miss={nOf(t) < 1}>×{nOf(t)}</span>
			</div>
		{/each}
		<span class="recipe-arrow">→</span>
		<div class="recipe-result">
			<span class="user-badge" style="font-size:16px;">【国庆快乐】</span>
		</div>
	</div>
	<form method="post" action="?/craft">
		<button
			type="submit"
			class="btn btn-primary"
			disabled={!canCraft}
			title={canCraft ? '' : data.badge ? '已拥有称号' : '材料不足'}
		>
			{data.badge ? '已装备' : canCraft ? '合成称号' : '材料不足'}
		</button>
	</form>
</section>

<!-- 交易②③④：积分买花 -->
<section>
	<h2 class="section-title">🌷 积分兑换花朵</h2>
	<div class="buy-grid">
		{#each FLOWER_LIST as f (f.key)}
			<section class="card trade-card">
				<div class="trade-head">
					<div class="trade-title">{f.name}</div>
					<div class="trade-sub"><span class="tag">绝版</span> · {price} 积分 / 朵</div>
				</div>
				<img src={f.image} alt={f.name} class="buy-img" />
				<form method="post" action="?/buy">
					<input type="hidden" name="itemType" value={f.key} />
					<button
						type="submit"
						class="btn btn-primary"
						disabled={!canBuy}
						title={canBuy ? '' : '积分不足'}
					>
						{canBuy ? `花费 ${price} 积分购买` : '积分不足'}
					</button>
				</form>
			</section>
		{/each}
	</div>
</section>

<style>
	.wallet {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 20px;
	}
	.wallet-item {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px 16px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.wallet-label {
		color: var(--text-secondary);
		font-size: 13px;
	}
	.wallet-value {
		font-weight: 700;
		font-size: 15px;
	}
	.trade-card {
		margin-bottom: 16px;
	}
	.trade-head {
		margin-bottom: 12px;
	}
	.trade-title {
		font-weight: 700;
		font-size: 16px;
	}
	.trade-sub {
		color: var(--text-secondary);
		font-size: 13px;
		margin-top: 2px;
	}
	.trade-recipe {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.recipe-item {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 6px 10px;
		font-size: 13px;
	}
	.recipe-item img {
		width: 26px;
		height: 26px;
		image-rendering: pixelated;
	}
	.recipe-count {
		font-weight: 700;
	}
	.recipe-count.miss,
	.recipe-missing {
		opacity: 0.45;
	}
	.recipe-arrow {
		font-size: 20px;
		color: var(--text-secondary);
	}
	.recipe-result {
		background: var(--surface-2);
		border: 1px dashed var(--accent);
		border-radius: 10px;
		padding: 8px 14px;
	}
	.buy-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 14px;
		margin-bottom: 20px;
	}
	.buy-img {
		width: 84px;
		height: 84px;
		image-rendering: pixelated;
		display: block;
		margin: 0 auto 12px;
	}
</style>
