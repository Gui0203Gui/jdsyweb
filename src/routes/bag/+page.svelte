<script lang="ts">
	import type { PageProps } from './$types';
	import { FLOWERS, type FlowerType } from '#lib/flowers';

	let { data, form }: PageProps = $props();

	const FLOWER_LIST = Object.values(FLOWERS);

	// MC 物品栏：固定 9 列网格，只放拥有的道具，其余为暗色空槽
	const SLOTS_PER_ROW = 9;
	// 槽位按 9 的倍数补齐（最少 1 行 9 格）：只放拥有的道具，空槽补位
	const slots = $derived.by(() => {
		const total = Math.max(
			SLOTS_PER_ROW,
			Math.ceil(data.counts.length / SLOTS_PER_ROW) * SLOTS_PER_ROW
		);
		const arr: {
			type: string | null;
			info: (typeof FLOWERS)[keyof typeof FLOWERS] | null;
			n: number;
		}[] = [];
		for (const c of data.counts) {
			arr.push({ type: c.type, info: c.info, n: c.n });
		}
		while (arr.length < total) {
			arr.push({ type: null, info: null, n: 0 });
		}
		return arr;
	});

	let selected = $state<string | null>(null);
	function pick(type: string) {
		selected = selected === type ? null : type;
	}

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}

	const selInfo = (t: string | null) => FLOWERS[t as FlowerType] ?? null;
</script>

<svelte:head>
	<title>我的背包 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🎒 我的背包</h1>
<p class="form-hint" style="margin-bottom:16px;">
	绝版花朵道具存放在这里。点击格子可以选择送给其他吧友。
</p>

{#if form?.success}
	<div class="form-success">{form.success}</div>
{/if}
{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<!-- MC 风格物品栏 -->
<section class="inventory">
	<div class="inventory-grid">
		{#each slots as slot, i (i)}
			{#if slot.type}
				<button
					type="button"
					class="slot slot-filled"
					class:slot-selected={selected === slot.type}
					onclick={() => pick(slot.type!)}
					title={`${slot.info?.name ?? slot.type} × ${slot.n}`}
				>
					{#if slot.info}
						<img src={slot.info.image} alt={slot.info.name} class="slot-icon" />
					{:else}
						<span class="slot-icon slot-unknown">🪻</span>
					{/if}
					<span class="slot-count">{slot.n}</span>
				</button>
			{:else}
				<div class="slot slot-empty" aria-hidden="true"></div>
			{/if}
		{/each}
	</div>
</section>

{#if selected}
	{@const info = selInfo(selected)}
	<section class="card send-card">
		<div class="send-title">
			{#if info}
				<img src={info.image} alt="" class="send-icon" />
			{/if}
			送出「{info?.name ?? selected}」{info?.tag ?? ''} × 1
		</div>
		<form method="post" action="?/send" class="flex" style="gap:8px;">
			<input type="hidden" name="itemType" value={selected} />
			<input
				type="text"
				name="username"
				class="form-input"
				placeholder="接收者的用户名"
				required
				style="max-width:240px;"
			/>
			<button type="submit" class="btn btn-primary btn-sm">确认送出</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => (selected = null)}>
				取消
			</button>
		</form>
	</section>
{/if}

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
						<img src={it.info.image} alt={it.info.name} class="flower-img-sm" />
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
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	/* MC 物品栏风格：深色底板 + 浅灰槽框 */
	.inventory {
		background: linear-gradient(#3a3a3a, #232323);
		border: 2px solid #111;
		border-radius: 8px;
		padding: 10px;
		margin-bottom: 20px;
		display: inline-block;
		max-width: 100%;
	}
	.inventory-grid {
		display: grid;
		grid-template-columns: repeat(9, minmax(0, 1fr));
		gap: 4px;
	}
	.slot {
		width: 60px;
		height: 60px;
		background: #1b1b1b;
		border: 2px solid #555;
		border-radius: 4px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.6);
	}
	.slot-empty {
		border-color: #3a3a3a;
		background: #171717;
	}
	.slot-filled {
		cursor: pointer;
	}
	.slot-filled:hover {
		border-color: #fff;
		box-shadow: 0 0 6px rgba(255, 255, 255, 0.35);
	}
	.slot-selected {
		border-color: #ffd166 !important;
		box-shadow: 0 0 8px rgba(255, 209, 102, 0.6);
	}
	.slot-icon {
		width: 44px;
		height: 44px;
		image-rendering: pixelated;
		pointer-events: none;
	}
	.slot-unknown {
		font-size: 28px;
	}
	.slot-count {
		position: absolute;
		right: 3px;
		bottom: 1px;
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-shadow:
			1px 1px 0 #000,
			-1px 1px 0 #000,
			1px -1px 0 #000,
			-1px -1px 0 #000;
		pointer-events: none;
	}
	.send-card {
		margin-bottom: 20px;
	}
	.send-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		margin-bottom: 10px;
	}
	.send-icon {
		width: 28px;
		height: 28px;
		image-rendering: pixelated;
	}
	.flower-img-sm {
		width: 40px;
		height: 40px;
		image-rendering: pixelated;
		margin: 0 12px 0 0;
	}
	.mt-16 {
		margin-top: 16px;
	}
</style>
