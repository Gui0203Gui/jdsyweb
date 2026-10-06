<script lang="ts">
	import { goto } from '$app/navigation';

	let { data }: { data: import('./$types').PageData } = $props();
	let name = $state('');
	let creating = $state(false);
	let error = $state('');

	async function create() {
		if (!name.trim()) return;
		creating = true;
		error = '';
		const res = await fetch('/api/game/maps', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: name.trim() })
		});
		const j: any = await res.json().catch(() => null);
		creating = false;
		if (!res.ok || !j?.ok) {
			error = j?.error ?? '创建失败';
			return;
		}
		goto(`/games/${j.id}`);
	}
</script>

<svelte:head><title>交大工坊 · 冒险板块</title></svelte:head>

<div class="lobby">
	<div class="hero">
		<h1>⛏️ 交大工坊</h1>
		<p class="sub">多人同图协作建造 · 你的资源你做主 · 产出可兑换积分与花朵</p>
	</div>

	<div class="create card">
		<h2>新建地图</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				create();
			}}
		>
			<input bind:value={name} maxlength="20" placeholder="给新世界起个名字（1-20 字）" />
			<button type="submit" disabled={creating || !name.trim()}>
				{creating ? '创建中…' : '创建并进入'}
			</button>
		</form>
		{#if error}<p class="err">{error}</p>{/if}
	</div>

	<h2 class="list-title">公开地图</h2>
	<div class="grid">
		{#each data.maps as m (m.id)}
			<a class="card map" href={`/games/${m.id}`}>
				<div class="map-name">{m.name}</div>
				<div class="meta">
					<span>👤 {m.ownerName}</span>
					<span>🧱 {m.tileCount} 个建筑</span>
				</div>
				<div class="updated">
					更新于 {new Date(m.updatedAt).toLocaleString('zh-CN', { hour12: false })}
				</div>
			</a>
		{:else}
			<p class="empty">还没有地图，来创建第一个世界吧！</p>
		{/each}
	</div>
</div>

<style>
	.lobby {
		max-width: 960px;
		margin: 0 auto;
		padding: 24px 16px 64px;
	}
	.hero {
		text-align: center;
		padding: 20px 0 8px;
	}
	.hero h1 {
		font-size: 30px;
		margin: 0;
	}
	.sub {
		color: var(--text-2, #666);
	}
	.card {
		background: var(--bg-1, #fff);
		border: 1px solid var(--bd, #e2e2e2);
		border-radius: 10px;
		padding: 16px;
	}
	.create {
		margin: 16px 0 28px;
	}
	.create form {
		display: flex;
		gap: 8px;
	}
	.create input {
		flex: 1;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--bd, #d0d0d0);
		font-size: 15px;
	}
	.create button {
		padding: 10px 18px;
		border-radius: 8px;
		border: 0;
		background: #2f7de1;
		color: #fff;
		font-size: 15px;
		cursor: pointer;
	}
	.create button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.err {
		color: #d33;
		margin: 10px 0 0;
	}
	.list-title {
		font-size: 18px;
		margin: 0 0 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}
	.map {
		display: block;
		color: inherit;
		text-decoration: none;
		transition: transform 0.1s;
	}
	.map:hover {
		transform: translateY(-2px);
		border-color: #2f7de1;
	}
	.map-name {
		font-size: 17px;
		font-weight: 600;
		margin-bottom: 8px;
	}
	.meta {
		display: flex;
		gap: 14px;
		color: var(--text-2, #666);
		font-size: 13px;
		margin-bottom: 6px;
	}
	.updated {
		font-size: 12px;
		color: var(--text-3, #999);
	}
	.empty {
		color: var(--text-3, #999);
		padding: 8px 0;
	}
</style>
