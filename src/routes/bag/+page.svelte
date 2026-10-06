<script lang="ts">
	import type { PageProps } from './$types';
	import {
		BADGE_INFOS,
		BADGE_TYPES,
		FLOWERS,
		MISC_ITEMS,
		itemInfo,
		type BadgeType,
		type FlowerType
	} from '#lib/flowers';

	let { data, form }: PageProps = $props();

	const FLOWER_LIST = Object.values(FLOWERS);
	const BADGE_LIST = Object.values(BADGE_INFOS);
	const MISC_LIST = Object.values(MISC_ITEMS);

	// MC 物品栏：固定 9 列网格，只放拥有的道具，其余为暗色空槽
	const SLOTS_PER_ROW = 9;

	type SlotInfo = { name: string; icon?: string; image?: string; tag: string };

	const slots = $derived.by(() => {
		const total = Math.max(
			SLOTS_PER_ROW,
			Math.ceil(data.counts.length / SLOTS_PER_ROW) * SLOTS_PER_ROW
		);
		const arr: { type: string | null; info: SlotInfo | null; n: number; equipped: boolean }[] = [];
		for (const c of data.counts) {
			arr.push({
				type: c.type,
				info: c.info as SlotInfo | null,
				n: c.n,
				equipped: c.type.startsWith('badge:') && c.type === data.equippedBadge
			});
		}
		while (arr.length < total) {
			arr.push({ type: null, info: null, n: 0, equipped: false });
		}
		return arr;
	});

	let selected = $state<string | null>(null);
	function pick(type: string) {
		selected = selected === type ? null : type;
	}

	const isBadgeSel = $derived(selected ? BADGE_TYPES.includes(selected as BadgeType) : false);
	const isNameCardSel = $derived(selected === 'item:namecard');
	const selInfo = $derived<SlotInfo | null>(
		selected ? (itemInfo(selected) as SlotInfo | null) : null
	);
	const selBadgeKey = $derived<BadgeType | null>(
		selected && BADGE_TYPES.includes(selected as BadgeType) ? (selected as BadgeType) : null
	);

	// 送称号：优先送未装备的那件；若全部装备中则送装备件（发送后自动脱下）
	const badgeSendItem = $derived(
		data.items.find((it) => it.itemType.startsWith('badge:') && !it.equipped) ??
			data.items.find((it) => it.itemType.startsWith('badge:'))
	);
	const badgeEquipItem = $derived(
		data.items.find((it) => it.itemType.startsWith('badge:') && !it.equipped)
	);

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}

	function srcName(source: string): string {
		switch (source) {
			case 'festival-signin':
				return '🎁 国庆签到';
			case 'gift':
				return '💌 好友赠送';
			case 'shop':
				return '🛒 商店购买';
			case 'craft':
				return '🔨 商店合成';
			case 'admin':
				return '🛠️ 管理员发放';
			default:
				return source;
		}
	}
</script>

<svelte:head>
	<title>我的背包 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🎒 我的背包</h1>
<p class="form-hint" style="margin-bottom:16px;">
	绝版花朵与称号道具存放在这里。点击格子可以选择送给其他吧友；称号道具可以穿戴 / 脱下。
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
					class:slot-equipped={slot.equipped}
					onclick={() => pick(slot.type!)}
					title={`${slot.info?.name ?? slot.type} × ${slot.n}${slot.equipped ? '（已装备）' : ''}`}
				>
					{#if slot.info?.image}
						<img src={slot.info.image} alt={slot.info.name} class="slot-icon" />
					{:else}
						<span class="slot-icon slot-emoji">{slot.info?.icon ?? '🪻'}</span>
					{/if}
					<span class="slot-count">{slot.n}</span>
					{#if slot.equipped}
						<span class="slot-equipped-tag">装</span>
					{/if}
				</button>
			{:else}
				<div class="slot slot-empty" aria-hidden="true"></div>
			{/if}
		{/each}
	</div>
</section>

{#if selected}
	<section class="card send-card">
		{#if isBadgeSel && selBadgeKey}
			<div class="send-title">
				<span class="slot-icon slot-emoji" style="font-size:24px;"
					>{BADGE_INFOS[selBadgeKey].icon}</span
				>
				称号【{BADGE_INFOS[selBadgeKey].shortName}】{BADGE_INFOS[selBadgeKey].tag}
				{#if data.equippedBadge === selBadgeKey}
					<span class="tag" style="background:#16a34a;color:#fff;">已装备</span>
				{:else}
					<span class="tag">未装备</span>
				{/if}
			</div>
			<div class="send-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
				{#if badgeEquipItem && data.equippedBadge !== selBadgeKey}
					<form method="post" action="?/equip">
						<input type="hidden" name="itemId" value={badgeEquipItem.id} />
						<button type="submit" class="btn btn-primary btn-sm">穿戴称号</button>
					</form>
				{/if}
				{#if data.equippedBadge === selBadgeKey}
					<form method="post" action="?/unequip">
						<button type="submit" class="btn btn-ghost btn-sm">脱下称号</button>
					</form>
				{/if}
			</div>
			{#if selBadgeKey === 'badge:strong'}
				<p class="form-hint">💎 全成就奖励称号，不可赠送（只能自己穿戴 / 脱下）</p>
			{:else if badgeSendItem}
				<form method="post" action="?/sendBadge" class="flex" style="gap:8px;">
					<input type="hidden" name="itemId" value={badgeSendItem.id} />
					<input
						type="text"
						name="username"
						class="form-input"
						placeholder="接收者的用户名"
						required
						style="max-width:240px;"
					/>
					<button type="submit" class="btn btn-primary btn-sm">送称号给 TA</button>
				</form>
			{/if}
		{:else if isNameCardSel}
			<div class="send-title">
				<img src="/misc/namecard.svg" alt="改名卡" class="send-icon" />
				使用改名卡（当前用户名：{data.username}）
			</div>
			<p class="form-hint" style="margin-bottom:12px;">
				消耗 1 张改名卡，将用户名改为新昵称（2-20
				位中文、字母、数字或下划线）。改名后需用新用户名登录，旧主页链接将失效。
			</p>
			<form method="post" action="?/rename" class="flex" style="gap:8px;">
				<input
					type="text"
					name="username"
					class="form-input"
					placeholder="新用户名"
					required
					minlength="2"
					maxlength="20"
					style="max-width:240px;"
				/>
				<button type="submit" class="btn btn-primary btn-sm">确认改名（消耗 1 张）</button>
			</form>
		{:else}
			<div class="send-title">
				{#if selInfo?.image}
					<img src={selInfo.image} alt="" class="send-icon" />
				{/if}
				送出「{selInfo?.name ?? selected}」{selInfo?.tag ?? ''} × 1
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
			</form>
		{/if}
		<div style="margin-top:10px;">
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => (selected = null)}>
				取消
			</button>
		</div>
	</section>
{/if}

<!-- 管理员取物栏 -->
{#if data.isAdmin}
	<section class="card" style="margin-bottom:20px;">
		<h2 class="section-title">🔧 管理员取物栏</h2>
		<p class="form-hint" style="margin-bottom:12px;">
			仅管理员可见：可无限领取物品放入自己背包（每点一次领取 1 个），之后可赠送给其他吧友。
		</p>
		<div class="take-grid">
			{#each [...FLOWER_LIST, ...BADGE_LIST, ...MISC_LIST] as item (item.key)}
				<form method="post" action="?/takeItem" class="take-item">
					<input type="hidden" name="itemType" value={item.key} />
					{#if 'image' in item && item.image}
						<img src={item.image} alt="" class="take-icon" />
					{:else}
						<span class="take-icon" style="font-size:24px;line-height:1;">{item.icon}</span>
					{/if}
					<span class="take-name">{item.name}</span>
					<button type="submit" class="btn btn-primary btn-sm">＋1</button>
				</form>
			{/each}
		</div>
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
					{#if it.info?.image}
						<img src={it.info.image} alt={it.info.name} class="flower-img-sm" />
					{:else if it.info?.icon}
						<span class="avatar" style="font-size:24px;">{it.info.icon}</span>
					{:else}
						<span class="avatar">🪻</span>
					{/if}
					<div class="teacher-info" style="flex:1;">
						<div class="teacher-name">
							{it.info?.name ?? it.itemType}
							<span class="tag">{it.info?.tag ?? '道具'}</span>
							{#if it.equipped}
								<span class="tag" style="background:#16a34a;color:#fff;">已装备</span>
							{/if}
						</div>
						<div class="teacher-desc">
							来源：{srcName(it.source)} · 获得于 {fmtDate(it.createdAt)}
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
	.slot-equipped {
		border-color: #4ade80;
		box-shadow: 0 0 6px rgba(74, 222, 128, 0.4);
	}
	.slot-icon {
		width: 44px;
		height: 44px;
		image-rendering: pixelated;
		pointer-events: none;
	}
	.slot-emoji {
		font-size: 32px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
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
	.slot-equipped-tag {
		position: absolute;
		left: 3px;
		top: 2px;
		background: #16a34a;
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		padding: 0 4px;
		border-radius: 3px;
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
	.take-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}
	.take-item {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #f6f8fa;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px 12px;
	}
	.take-icon {
		width: 32px;
		height: 32px;
		image-rendering: pixelated;
		flex: none;
	}
	.take-name {
		flex: 1;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mt-16 {
		margin-top: 16px;
	}
</style>
