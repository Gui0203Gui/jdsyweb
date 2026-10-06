<script lang="ts">
	import { onMount } from 'svelte';

	let { data }: { data: import('./$types').PageData } = $props();

	const SIZE = 100;
	const CELL = 6;

	const BUILDS = {
		miner: { name: '⛏️ 矿机', icon: '⛏️', color: '#8d7b5f', desc: '产出铁矿石' },
		lumber: { name: '🪚 伐木场', icon: '🪚', color: '#7a5c33', desc: '产出木材' },
		farm: { name: '🌾 农田', icon: '🌾', color: '#c9a227', desc: '产出小麦' },
		flower: { name: '🌼 花田', icon: '🌼', color: '#e05f9e', desc: '产出花朵点' },
		lantern: { name: '🏮 路灯', icon: '🏮', color: '#d97706', desc: '装饰' },
		campfire: { name: '🔥 篝火', icon: '🔥', color: '#ea580c', desc: '装饰' }
	} as const;
	type BuildKey = keyof typeof BUILDS;

	let tiles = $state<{ x: number; y: number; type: string; ownerId: string }[]>(data.tiles);
	let chat = $state<{ username: string; content: string; createdAt: Date }[]>(
		data.chat.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }))
	);
	let resources = $state(data.resources);
	let players = $state(data.players);
	let ranking = $state(data.ranking);
	let selected = $state<BuildKey>('miner');
	let tool = $state<'build' | 'remove'>('build');
	let msg = $state('');
	let tip = $state('');
	let canvas = $state<HTMLCanvasElement | null>(null);
	const worldId = data.world.id;
	const myId = data.myId;

	let tipTimer: ReturnType<typeof setTimeout> | undefined;

	function showTip(t: string) {
		tip = t;
		if (tipTimer) clearTimeout(tipTimer);
		tipTimer = setTimeout(() => (tip = ''), 2600);
	}

	function draw() {
		const cv = canvas;
		if (!cv) return;
		const ctx = cv.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = '#7fae5a';
		ctx.fillRect(0, 0, cv.width, cv.height);
		ctx.strokeStyle = 'rgba(0,0,0,.08)';
		ctx.lineWidth = 1;
		for (let i = 0; i <= SIZE; i++) {
			ctx.beginPath();
			ctx.moveTo(i * CELL + 0.5, 0);
			ctx.lineTo(i * CELL + 0.5, cv.height);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, i * CELL + 0.5);
			ctx.lineTo(cv.width, i * CELL + 0.5);
			ctx.stroke();
		}
		for (const t of tiles) {
			const b = BUILDS[t.type as BuildKey];
			if (!b) continue;
			ctx.fillStyle = b.color;
			ctx.fillRect(t.x * CELL + 1, t.y * CELL + 1, CELL - 2, CELL - 2);
			ctx.fillStyle = 'rgba(255,255,255,.85)';
			ctx.font = `${Math.floor(CELL * 0.72)}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(b.icon, t.x * CELL + CELL / 2, t.y * CELL + CELL / 2 + 1);
		}
	}

	function onClick(e: MouseEvent) {
		const cv = canvas;
		if (!cv) return;
		const rect = cv.getBoundingClientRect();
		const x = Math.floor(((e.clientX - rect.left) * cv.width) / rect.width / CELL);
		const y = Math.floor(((e.clientY - rect.top) * cv.height) / rect.height / CELL);
		if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
		act(tool === 'build' ? 'place' : 'remove', x, y, tool === 'build' ? selected : undefined);
	}

	async function act(action: string, x: number, y: number, type?: BuildKey) {
		const body: Record<string, unknown> = { action, x, y };
		if (type) body.type = type;
		const res = await fetch(`/api/game/world`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const j: any = await res.json().catch(() => null);
		if (!res.ok) {
			showTip(j?.error ?? '操作失败');
			return;
		}
		if (action === 'place') {
			tiles = [...tiles, { x, y, type: String(type), ownerId: myId }];
		} else if (action === 'remove') {
			tiles = tiles.filter((t) => !(t.x === x && t.y === y));
		}
		draw();
	}

	async function collect() {
		const res = await fetch(`/api/game/world`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'collect' })
		});
		const j: any = await res.json().catch(() => null);
		if (!res.ok) {
			showTip(j?.error ?? '收集失败');
			return;
		}
		const g: Record<string, number> = j.gained ?? {};
		const parts = Object.entries(g)
			.map(([k, v]) => `${k} +${v}`)
			.join(' ');
		showTip(parts ? `收集成功：${parts}` : '没有可收集的产出建筑');
		await refresh();
	}

	async function exchange(kind: 'points' | 'flower', resourceType?: string) {
		const body: Record<string, unknown> = {
			action: kind === 'points' ? 'exchangePoints' : 'exchangeFlower'
		};
		if (resourceType) body.resourceType = resourceType;
		const res = await fetch(`/api/game/world`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const j: any = await res.json().catch(() => null);
		if (!res.ok) {
			showTip(j?.error ?? '兑换失败');
			return;
		}
		showTip(
			kind === 'points' ? `兑换成功：+${j.gained} 积分（每日上限 100）` : '兑换成功：获得 1 朵花'
		);
		await refresh();
	}

	async function steal(targetId: string, username: string) {
		const res = await fetch(`/api/game/world`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'steal', targetId })
		});
		const j: any = await res.json().catch(() => null);
		if (!res.ok) {
			showTip(j?.error ?? '偷取失败');
			return;
		}
		const parts = Object.entries(j.gained ?? {})
			.map(([k, v]) => `${k} +${v}`)
			.join(' ');
		showTip(`从 ${username} 偷到：${parts}`);
		await refresh();
	}

	async function sendChat() {
		if (!msg.trim()) return;
		const res = await fetch(`/api/game/world`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'chat', content: msg.trim() })
		});
		msg = '';
		if (!res.ok) return;
		await refreshChat();
	}

	async function refresh() {
		const res = await fetch(`/api/game/world`);
		if (!res.ok) return;
		const j: any = await res.json();
		tiles = j.tiles ?? [];
		if (j.resources) resources = j.resources;
		if (j.players) players = j.players;
		if (j.ranking) ranking = j.ranking;
		draw();
	}

	async function refreshChat() {
		const res = await fetch(`/api/game/world`);
		if (!res.ok) return;
		const j: any = await res.json();
		chat = (j.chat ?? []).map((c: { username: string; content: string; createdAt: string }) => ({
			username: c.username,
			content: c.content,
			createdAt: new Date(c.createdAt)
		}));
	}

	onMount(() => {
		draw();
		const timer = setInterval(refresh, 15000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head><title>{data.world.name} · 交大工坊</title></svelte:head>

<div class="game">
	<div class="topbar">
		<h1>⛏️ {data.world.name}</h1>
		<span class="hint-label">所有人共用一张世界地图，一起协作建造吧！</span>
	</div>

	<div class="stage">
		<div class="board-wrap">
			<canvas
				bind:this={canvas}
				width={SIZE * CELL}
				height={SIZE * CELL}
				onclick={onClick}
				title="左键：放置/拆除"
			></canvas>
			{#if tip}<div class="tip">{tip}</div>{/if}
		</div>

		<aside class="panel">
			<div class="sec">
				<h3>工具</h3>
				<div class="tools">
					<button class="tool-btn {tool === 'build' ? 'on' : ''}" onclick={() => (tool = 'build')}
						>🛠 建造</button
					>
					<button class="tool-btn {tool === 'remove' ? 'on' : ''}" onclick={() => (tool = 'remove')}
						>🧹 拆除</button
					>
				</div>
				{#if tool === 'build'}
					<h3>选择建筑</h3>
					<div class="builds">
						{#each Object.entries(BUILDS) as [key, b] (key)}
							<button
								class="build {selected === key ? 'on' : ''}"
								onclick={() => (selected = key as BuildKey)}
							>
								<span class="bi">{b.icon}</span>
								<span class="bn">{b.name}</span>
								<span class="bd">{b.desc}</span>
							</button>
						{/each}
					</div>
				{:else}
					<p class="hint">点击你想拆除的建筑——公共地图上任何人的建筑都可以拆除（竞争）</p>
				{/if}
			</div>

			<div class="sec">
				<h3>我的资源</h3>
				<div class="res">
					<span>⛏️ 铁 {resources?.iron ?? 0}</span>
					<span>🪵 木 {resources?.wood ?? 0}</span>
					<span>🌾 麦 {resources?.wheat ?? 0}</span>
					<span>🌼 花 {resources?.flower ?? 0}</span>
				</div>
				<button class="main-btn" onclick={collect}>📦 收集产出</button>
			</div>

			<div class="sec">
				<h3>兑换（每日积分上限 100）</h3>
				<p class="hint">10 铁/木/麦 → 1 积分 · 5 花 → 1 朵花</p>
				<div class="exchange">
					<button onclick={() => exchange('points', 'iron')}>铁→积分</button>
					<button onclick={() => exchange('points', 'wood')}>木→积分</button>
					<button onclick={() => exchange('points', 'wheat')}>麦→积分</button>
					<button onclick={() => exchange('flower')}>花→花朵</button>
				</div>
			</div>

			<div class="sec">
				<h3>抢夺资源</h3>
				<p class="hint">每人每天从同一玩家最多偷 10 资源</p>
				<div class="steal-list">
					{#each players as pl (pl.userId)}
						<div class="steal-item">
							<span class="si-name">{pl.username}</span>
							<span class="si-res"
								>{Object.entries(pl.resources)
									.filter(([, v]) => v > 0)
									.map(([k, v]) => `${k} ${v}`)
									.join(' / ') || '无资源'}</span
							>
							<button onclick={() => steal(pl.userId, pl.username)}>偷取</button>
						</div>
					{:else}
						<p class="hint">还没有其他玩家有资源</p>
					{/each}
				</div>
			</div>

			<div class="sec">
				<h3>世界排行榜</h3>
				<div class="rank-list">
					{#each ranking as r, i (r.userId)}
						<div class="rank-item">
							<span class="rk-no">{i + 1}</span>
							<span class="rk-name">{r.username}</span>
							<span class="rk-meta">🧱{r.buildingCount} · 📦{r.totalResources} · ⭐{r.points}</span>
						</div>
					{:else}
						<p class="hint">还没有人建造</p>
					{/each}
				</div>
			</div>

			<div class="sec">
				<h3>世界聊天</h3>
				<div class="chatbox">
					{#each [...chat].reverse() as c (c.content + c.username)}
						<div class="chat-item"><b>{c.username}</b>：{c.content}</div>
					{:else}
						<p class="hint">还没有消息</p>
					{/each}
				</div>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						sendChat();
					}}
				>
					<input bind:value={msg} maxlength="100" placeholder="发条消息…" />
					<button type="submit">发送</button>
				</form>
			</div>
		</aside>
	</div>
</div>

<style>
	.game {
		max-width: 1100px;
		margin: 0 auto;
		padding: 16px 16px 64px;
	}
	.topbar {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.topbar h1 {
		font-size: 22px;
		margin: 0;
	}
	.hint-label {
		color: var(--text-2, #666);
		font-size: 13px;
	}
	.stage {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 16px;
		align-items: start;
	}
	@media (max-width: 860px) {
		.stage {
			grid-template-columns: 1fr;
		}
	}
	.board-wrap {
		position: relative;
		overflow-x: auto;
	}
	canvas {
		background: #7fae5a;
		border-radius: 8px;
		cursor: crosshair;
		image-rendering: pixelated;
		max-width: 100%;
	}
	.tip {
		position: absolute;
		left: 50%;
		top: 10px;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.78);
		color: #fff;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 13px;
		pointer-events: none;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.sec {
		background: var(--bg-1, #fff);
		border: 1px solid var(--bd, #e2e2e2);
		border-radius: 10px;
		padding: 12px;
	}
	.sec h3 {
		margin: 0 0 8px;
		font-size: 14px;
	}
	.tools {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}
	.tool-btn {
		flex: 1;
		padding: 8px 0;
		border: 1px solid var(--bd, #d0d0d0);
		background: var(--bg-1, #fff);
		border-radius: 8px;
		cursor: pointer;
	}
	.tool-btn.on {
		background: #2f7de1;
		color: #fff;
		border-color: #2f7de1;
	}
	.builds {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.build {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 4px;
		border: 1px solid var(--bd, #d0d0d0);
		background: var(--bg-1, #fff);
		border-radius: 8px;
		cursor: pointer;
	}
	.build.on {
		border-color: #2f7de1;
		background: rgba(47, 125, 225, 0.08);
	}
	.bi {
		font-size: 20px;
	}
	.bn {
		font-size: 12px;
		font-weight: 600;
	}
	.bd {
		font-size: 11px;
		color: var(--text-3, #999);
	}
	.hint {
		color: var(--text-3, #999);
		font-size: 12px;
		margin: 0 0 8px;
	}
	.res {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		font-size: 13px;
		margin-bottom: 8px;
	}
	.main-btn {
		width: 100%;
		padding: 9px 0;
		border: 0;
		border-radius: 8px;
		background: #2f7de1;
		color: #fff;
		cursor: pointer;
	}
	.exchange {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}
	.exchange button {
		padding: 7px 0;
		border: 1px solid var(--bd, #d0d0d0);
		background: var(--bg-1, #fff);
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
	}
	.exchange button:hover {
		border-color: #2f7de1;
	}
	.chatbox {
		height: 180px;
		overflow-y: auto;
		background: var(--bg-0, #f7f7f7);
		border-radius: 8px;
		padding: 8px;
		margin-bottom: 8px;
	}
	.chat-item {
		font-size: 13px;
		margin-bottom: 4px;
	}
	.chat-item b {
		color: #2f7de1;
	}
	form {
		display: flex;
		gap: 6px;
	}
	form input {
		flex: 1;
		padding: 7px 10px;
		border: 1px solid var(--bd, #d0d0d0);
		border-radius: 8px;
		font-size: 13px;
	}
	form button {
		padding: 7px 12px;
		border: 0;
		border-radius: 8px;
		background: #2f7de1;
		color: #fff;
		cursor: pointer;
	}
	.steal-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 150px;
		overflow-y: auto;
	}
	.steal-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}
	.si-name {
		font-weight: 600;
		min-width: 60px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.si-res {
		flex: 1;
		color: var(--text-2, #666);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.steal-item button {
		padding: 3px 8px;
		border: 1px solid #d33;
		color: #d33;
		background: var(--bg-1, #fff);
		border-radius: 6px;
		cursor: pointer;
		font-size: 12px;
	}
	.steal-item button:hover {
		background: #d33;
		color: #fff;
	}
	.rank-list {
		display: flex;
		flex-direction: column;
		gap: 5px;
		max-height: 200px;
		overflow-y: auto;
	}
	.rank-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}
	.rk-no {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #2f7de1;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		flex-shrink: 0;
	}
	.rk-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rk-meta {
		margin-left: auto;
		color: var(--text-2, #666);
		flex-shrink: 0;
	}
</style>
