<script lang="ts">
	import { onMount } from 'svelte';

	let { data }: { data: import('./$types').PageData } = $props();

	const SIZE = 100;
	const VIEW = 5; // 视口 5x5 格
	const CELL = 80; // 每格放大到 80px

	const BUILDS = {
		miner: { name: '⛏️ 矿机', icon: '⛏️', color: '#8d7b5f', desc: '产出铁矿石', cost: 8, rate: 2 },
		lumber: { name: '🌳 伐木场', icon: '🌳', color: '#7a5c33', desc: '产出木材', cost: 8, rate: 2 },
		farm: { name: '🌾 农田', icon: '🌾', color: '#c9a227', desc: '产出小麦', cost: 8, rate: 2 },
		flower: {
			name: '🌼 花田',
			icon: '🌼',
			color: '#e05f9e',
			desc: '产出花朵点',
			cost: 12,
			rate: 1
		},
		lantern: { name: '🏮 路灯', icon: '🏮', color: '#d97706', desc: '装饰', cost: 4, rate: 0 },
		campfire: { name: '🔥 篝火', icon: '🔥', color: '#ea580c', desc: '装饰', cost: 4, rate: 0 }
	} as const;
	const PRODUCE_MS = 30 * 60 * 1000; // 设施每 30 分钟产生一次收入
	type BuildKey = keyof typeof BUILDS;

	const ARMIES = {
		army_infantry: {
			name: '⚔️ 步兵营',
			icon: '⚔️',
			color: '#4b5563',
			desc: '铁×15+木×15 → 10兵力',
			cost: 15
		},
		army_archer: {
			name: '🏹 弓兵营',
			icon: '🏹',
			color: '#2f7d4f',
			desc: '木×20+麦×10 → 8兵力',
			cost: 15
		},
		army_cavalry: {
			name: '🐎 骑兵营',
			icon: '🐎',
			color: '#7c3fae',
			desc: '铁×10+麦×20 → 12兵力',
			cost: 20
		}
	} as const;
	type ArmyKey = keyof typeof ARMIES;

	// 兵场像素贴图（canvas 上 emoji 渲染不稳定，改用贴图绘制）
	const ARMY_IMGS: Record<string, HTMLImageElement> = {};
	if (typeof window !== 'undefined') {
		for (const k of Object.keys(ARMIES)) {
			const img = new Image();
			img.src = `/game/${k}.png`;
			img.onload = () => draw();
			ARMY_IMGS[k] = img;
		}
	}

	let tiles = $state<
		{ x: number; y: number; type: string; ownerId: string; power: number; lastCollectAt: number }[]
	>(data.tiles);
	let hoverTile = $state<{ t: (typeof tiles)[number]; px: number; py: number } | null>(null);
	let chat = $state<{ username: string; content: string; createdAt: Date }[]>(
		data.chat.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }))
	);
	let resources = $state(data.resources);
	let points = $state(data.points);
	let armyPower = $state(data.armyPower);
	let players = $state(data.players);
	let ranking = $state(data.ranking);
	let selected = $state<BuildKey>('miner');
	let tool = $state<'build' | 'remove'>('build');
	let msg = $state('');
	let tip = $state('');
	let canvas = $state<HTMLCanvasElement | null>(null);
	let camX = $state(Math.floor(SIZE / 2 - VIEW / 2));
	let camY = $state(Math.floor(SIZE / 2 - VIEW / 2));
	let dragStart: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
	const worldId = data.world.id;
	const myId = data.myId;

	function clampCam(v: number) {
		return Math.max(0, Math.min(SIZE - VIEW, v));
	}

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
		// 视口网格（VIEW+1 条线）
		ctx.strokeStyle = 'rgba(0,0,0,.14)';
		ctx.lineWidth = 1.5;
		for (let i = 0; i <= VIEW; i++) {
			ctx.beginPath();
			ctx.moveTo(i * CELL + 0.5, 0);
			ctx.lineTo(i * CELL + 0.5, cv.height);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, i * CELL + 0.5);
			ctx.lineTo(cv.width, i * CELL + 0.5);
			ctx.stroke();
		}
		const x0 = camX,
			y0 = camY,
			x1 = camX + VIEW,
			y1 = camY + VIEW;
		for (const t of tiles) {
			if (t.x < x0 || t.x >= x1 || t.y < y0 || t.y >= y1) continue;
			const b = BUILDS[t.type as BuildKey];
			const a = ARMIES[t.type as ArmyKey];
			if (!b && !a) continue;
			const px = (t.x - camX) * CELL;
			const py = (t.y - camY) * CELL;
			ctx.fillStyle = b?.color ?? a?.color;
			ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
			const aimg = ARMY_IMGS[t.type];
			if (aimg && aimg.complete && aimg.naturalWidth > 0) {
				ctx.drawImage(aimg, px + 2, py + 2, CELL - 4, CELL - 4);
			} else {
				ctx.fillStyle = 'rgba(255,255,255,.92)';
				ctx.font = `bold ${Math.floor(CELL * 0.6)}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(b?.icon ?? a?.icon ?? '', px + CELL / 2, py + CELL / 2 + 2);
			}
			// 兵场兵力角标
			if (t.power > 0) {
				ctx.fillStyle = 'rgba(0,0,0,.72)';
				const r = Math.floor(CELL * 0.16);
				ctx.beginPath();
				ctx.arc(px + CELL - r - 3, py + 3 + r, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#fff';
				ctx.font = `bold ${Math.floor(CELL * 0.22)}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(String(t.power), px + CELL - r - 3, py + 3 + r + 1);
			}
			// 别人建筑加边框（竞争辨识）
			if (t.ownerId !== myId) {
				ctx.strokeStyle = 'rgba(220,38,38,.9)';
				ctx.lineWidth = 3;
				ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
			}
		}
		// 悬停提示
		const hv = hoverTile;
		if (hv) {
			const t = hv.t;
			const b = BUILDS[t.type as BuildKey];
			const a = ARMIES[t.type as ArmyKey];
			const lines: string[] = [];
			lines.push(
				`${b?.name ?? a?.name ?? t.type}${t.ownerId === myId ? '（我的）' : '（他人的）'}`
			);
			if (b && b.rate > 0) {
				lines.push(`每 30 分钟产出 ${b.rate} 个${b.desc.replace('产出', '')}`);
				const remaining = (t.lastCollectAt ?? 0) + PRODUCE_MS - Date.now();
				if (remaining > 0) {
					lines.push(
						`下次产出：${Math.floor(remaining / 60000)}分${Math.floor((remaining % 60000) / 1000)}秒`
					);
				} else {
					lines.push('✅ 可收获！');
				}
			} else if (b) {
				lines.push('装饰物，无产出');
			} else if (a) {
				lines.push(a.desc);
				lines.push(`当前兵力：${t.power}`);
			}
			ctx.font = '13px sans-serif';
			const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
			const h = lines.length * 18 + 12;
			let bx = hv.px + CELL;
			if (bx + w > cv.width - 4) bx = hv.px - w;
			let by = hv.py;
			if (by + h > cv.height - 4) by = hv.py - h;
			ctx.fillStyle = 'rgba(20,20,20,.88)';
			ctx.fillRect(Math.max(2, bx), Math.max(2, by), w, h);
			ctx.fillStyle = '#fff';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			lines.forEach((ln, i) => ctx.fillText(ln, bx + 8, by + 12 + i * 18));
		}
	}

	function onPointerDown(e: PointerEvent) {
		dragStart = { x: e.clientX, y: e.clientY, cx: camX, cy: camY, moved: false };
		const cv = canvas;
		cv?.setPointerCapture?.(e.pointerId);
	}

	function updateHover(e: PointerEvent) {
		const cv = canvas;
		if (!cv) return;
		const rect = cv.getBoundingClientRect();
		const gx = Math.floor(((e.clientX - rect.left) * cv.width) / rect.width / CELL);
		const gy = Math.floor(((e.clientY - rect.top) * cv.height) / rect.height / CELL);
		if (gx < 0 || gy < 0 || gx >= VIEW || gy >= VIEW) {
			hoverTile = null;
			return;
		}
		const x = camX + gx;
		const y = camY + gy;
		const t = tiles.find((tt) => tt.x === x && tt.y === y);
		hoverTile = t ? { t, px: gx * CELL, py: gy * CELL } : null;
		draw();
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragStart) {
			updateHover(e);
			return;
		}
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragStart.moved = true;
		const ncx = clampCam(dragStart.cx - Math.round(dx / CELL));
		const ncy = clampCam(dragStart.cy - Math.round(dy / CELL));
		if (ncx !== camX || ncy !== camY) {
			camX = ncx;
			camY = ncy;
			draw();
		}
	}

	function onPointerLeave() {
		dragStart = null;
		hoverTile = null;
		draw();
	}

	function onPointerUp(e: PointerEvent) {
		if (dragStart && !dragStart.moved) {
			const cv = canvas;
			if (cv) {
				const rect = cv.getBoundingClientRect();
				const gx = Math.floor(((e.clientX - rect.left) * cv.width) / rect.width / CELL);
				const gy = Math.floor(((e.clientY - rect.top) * cv.height) / rect.height / CELL);
				if (gx >= 0 && gy >= 0 && gx < VIEW && gy < VIEW) {
					const x = camX + gx;
					const y = camY + gy;
					act(tool === 'build' ? 'place' : 'remove', x, y, tool === 'build' ? selected : undefined);
				}
			}
		}
		dragStart = null;
	}

	function moveCam(dx: number, dy: number) {
		camX = clampCam(camX + dx);
		camY = clampCam(camY + dy);
		draw();
	}

	function centerCam() {
		camX = Math.floor(SIZE / 2 - VIEW / 2);
		camY = Math.floor(SIZE / 2 - VIEW / 2);
		draw();
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
			tiles = [
				...tiles,
				{ x, y, type: String(type), ownerId: myId, power: j.power ?? 0, lastCollectAt: Date.now() }
			];
			if (typeof j.cost === 'number') points = Math.max(0, (points ?? 0) - j.cost);
			showTip(`建造成功：${j.cost ?? 0} 积分${j.power ? `，兵力 ${j.power}` : ''}`);
		} else if (action === 'remove') {
			tiles = tiles.filter((t) => !(t.x === x && t.y === y));
			// 战斗战报
			if (j.battle) {
				const b = j.battle;
				const atkLabel = `我方 ${b.atkPower} ⚔ ${b.defPower} 敌方`;
				if (b.winner === 'atk') {
					showTip(`⚔️ 战报：${atkLabel}，我方获胜！剩余兵力 ${b.atkRemaining}，建筑已拆除`);
				} else if (b.winner === 'def') {
					showTip(`💥 战报：${atkLabel}，我方全军覆没！对方剩余 ${b.defRemaining}，建筑未能拆除`);
				} else {
					showTip(`⚖️ 战报：${atkLabel}，双方同归于尽，建筑未能拆除`);
				}
			} else {
				showTip(j.removed === false ? '拆除失败' : '已拆除');
			}
		}
		await refresh();
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
		const pend = (j.totalProducers ?? 0) - (j.readyCount ?? 0);
		if (parts) {
			showTip(
				pend > 0
					? `收集成功：${parts}（还有 ${pend} 个设施未就绪，每 30 分钟产出一次）`
					: `收集成功：${parts}`
			);
		} else {
			showTip(
				pend > 0 ? `设施都还在冷却中：${pend} 个未就绪，每 30 分钟产出一次` : '没有可收集的产出建筑'
			);
		}
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
		if (typeof j.points === 'number') points = j.points;
		if (typeof j.armyPower === 'number') armyPower = j.armyPower;
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
		const hoverTimer = setInterval(() => {
			if (hoverTile) draw();
		}, 1000);
		return () => {
			clearInterval(timer);
			clearInterval(hoverTimer);
		};
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
				width={VIEW * CELL}
				height={VIEW * CELL}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointerleave={onPointerLeave}
				title="拖动：平移地图 · 点击：放置/拆除 · 悬停：查看设施状态"
			></canvas>
			{#if tip}<div class="tip">{tip}</div>{/if}
			<div class="cam-bar">
				<span class="cam-pos"
					>视口 ({camX},{camY})–({camX + VIEW - 1},{camY + VIEW - 1}) / 100×100</span
				>
				<div class="cam-dpad">
					<button onclick={() => moveCam(0, -1)} aria-label="上移">▲</button>
					<button onclick={() => moveCam(-1, 0)} aria-label="左移">◀</button>
					<button onclick={() => moveCam(1, 0)} aria-label="右移">▶</button>
					<button onclick={() => moveCam(0, 1)} aria-label="下移">▼</button>
					<button class="cam-center" onclick={centerCam}>中心</button>
				</div>
			</div>
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
					<p class="hint">⏱ 产出建筑每 30 分钟可收获一次，悬停地图上的设施可查看进度</p>
					<h3>选择建筑（消耗积分）</h3>
					<div class="builds">
						{#each Object.entries(BUILDS) as [key, b] (key)}
							<button
								class="build {selected === key ? 'on' : ''}"
								onclick={() => (selected = key as BuildKey)}
							>
								<span class="bi">{b.icon}</span>
								<span class="bn">{b.name}</span>
								<span class="bd">{b.desc} · ⭐{b.cost}</span>
							</button>
						{/each}
					</div>
					<h3>兵场（材料合成，消耗积分）</h3>
					<div class="builds">
						{#each Object.entries(ARMIES) as [key, a] (key)}
							<button
								class="build {selected === key ? 'on' : ''}"
								onclick={() => (selected = key as BuildKey)}
							>
								<span class="bi">{a.icon}</span>
								<span class="bn">{a.name}</span>
								<span class="bd">{a.desc} · ⭐{a.cost}</span>
							</button>
						{/each}
					</div>
					<p class="hint">我的积分：⭐{points ?? 0} · 总兵力：⚔️ {armyPower ?? 0}</p>
				{:else}
					<p class="hint">拆除他人建筑需要兵场兵力（⚔️ 我方 {armyPower ?? 0}）。拆自己建筑免费。</p>
				{/if}
			</div>

			<div class="sec">
				<h3>我的资源</h3>
				<div class="res">
					<span>⭐ 积分 {points ?? 0}</span>
					<span>⚔️ 兵力 {armyPower ?? 0}</span>
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
		cursor: grab;
		image-rendering: pixelated;
		max-width: 100%;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	canvas:active {
		cursor: grabbing;
	}
	.cam-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 6px;
		font-size: 12px;
		color: var(--text-2, #666);
		flex-wrap: wrap;
	}
	.cam-pos {
		font-variant-numeric: tabular-nums;
	}
	.cam-dpad {
		display: flex;
		gap: 4px;
	}
	.cam-dpad button {
		width: 30px;
		height: 30px;
		border: 1px solid var(--bd, #d0d0d0);
		background: var(--bg-1, #fff);
		border-radius: 6px;
		cursor: pointer;
		font-size: 12px;
		line-height: 1;
	}
	.cam-dpad button:hover {
		border-color: #2f7de1;
	}
	.cam-dpad .cam-center {
		width: auto;
		padding: 0 8px;
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
