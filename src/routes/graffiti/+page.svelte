<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function fmtTime(ts: number | null): string {
		if (!ts) return '';
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
	}

	// ---- 共享画布状态 ----
	let canvas = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let drawing = $state(false);
	let color = $state('#e63946');
	let size = $state(6);
	let tool = $state<'brush' | 'eraser'>('brush');
	let saving = $state(false);
	let saveError = $state('');
	let saveOk = $state('');
	let lastPos: { x: number; y: number } | null = null;
	let loaded = $state(false);

	function ensureCanvas() {
		if (!canvas || ctx) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	}

	/** 页面加载后把共享画布画到 canvas 上 */
	$effect(() => {
		if (!canvas || loaded) return;
		ensureCanvas();
		loaded = true;
		if (!ctx) return;
		const c = canvas;
		const g = ctx;
		// 白底
		g.fillStyle = '#ffffff';
		g.fillRect(0, 0, c.width, c.height);
		if (data.wallUrl) {
			const img = new Image();
			img.onload = () => {
				g.drawImage(img, 0, 0, c.width, c.height);
			};
			// 带版本号请求，绕过浏览器缓存，确保拿到最新画布
			img.src = `${data.wallUrl}?v=${data.updatedAt ?? Date.now()}`;
		}
	});

	function pos(e: PointerEvent) {
		if (!canvas) return { x: 0, y: 0 };
		const r = canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - r.left) / r.width) * canvas.width,
			y: ((e.clientY - r.top) / r.height) * canvas.height
		};
	}

	function start(e: PointerEvent) {
		if (!canvas) return;
		ensureCanvas();
		drawing = true;
		lastPos = pos(e);
		canvas.setPointerCapture(e.pointerId);
	}

	function move(e: PointerEvent) {
		if (!drawing || !ctx || !lastPos || !canvas) return;
		const p = pos(e);
		ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
		ctx.lineWidth = tool === 'eraser' ? size * 2 : size;
		ctx.beginPath();
		ctx.moveTo(lastPos.x, lastPos.y);
		ctx.lineTo(p.x, p.y);
		ctx.stroke();
		lastPos = p;
	}

	function end() {
		drawing = false;
		lastPos = null;
	}

	function clearCanvas() {
		ensureCanvas();
		if (!canvas || !ctx) return;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	async function save() {
		if (!canvas || saving) return;
		saving = true;
		saveError = '';
		saveOk = '';
		try {
			const dataUrl = canvas.toDataURL('image/png');
			const res = await fetch('/api/graffiti', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: dataUrl })
			});
			const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
			if (!res.ok || !j.ok) {
				saveError = j.error ?? '保存失败';
			} else {
				saveOk = '画布已保存，大家都看得到啦！';
			}
		} catch {
			saveError = '保存失败，请重试';
		} finally {
			saving = false;
		}
	}

	const COLORS = [
		'#e63946',
		'#ff9f1c',
		'#ffd166',
		'#06d6a0',
		'#118ab2',
		'#457b9d',
		'#8338ec',
		'#3a0ca3',
		'#212121',
		'#f1faee'
	];
	const SIZES = [3, 6, 10, 18];
</script>

<svelte:head>
	<title>涂鸦留言板 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🎨 涂鸦留言板</h1>
<p class="form-hint" style="margin-bottom:16px;">
	<b>所有吧友共用这一张画布</b
	>——你画的每一笔都会留在上面，别人接着画。橡皮擦可以擦掉任意区域（包括别人画的），保存后画布更新。
</p>

<!-- 共享大画布 -->
<section class="board-card">
	<div class="board-toolbar">
		<div class="tool-group">
			{#each COLORS as c (c)}
				<button
					type="button"
					class="color-dot"
					class:active={tool === 'brush' && color === c}
					style={`background:${c};`}
					aria-label={c}
					onclick={() => {
						color = c;
						tool = 'brush';
					}}
				></button>
			{/each}
		</div>
		<div class="tool-group">
			{#each SIZES as s (s)}
				<button
					type="button"
					class="size-dot"
					class:active={tool === 'brush' && size === s}
					aria-label={`画笔粗细 ${s}px`}
					onclick={() => {
						size = s;
						tool = 'brush';
					}}><span style={`width:${s}px;height:${s}px;`}></span></button
				>
			{/each}
		</div>
		<button
			type="button"
			class="btn btn-ghost btn-sm"
			class:btn-primary={tool === 'eraser'}
			onclick={() => (tool = tool === 'eraser' ? 'brush' : 'eraser')}
		>
			🧽 橡皮擦{tool === 'eraser' ? '（开）' : ''}
		</button>
		<button type="button" class="btn btn-ghost btn-sm" onclick={clearCanvas}>🗑️ 清空画板</button>
		{#if data.user}
			<button type="button" class="btn btn-primary btn-sm" onclick={save} disabled={saving}>
				{saving ? '保存中…' : '💾 保存画布'}
			</button>
		{:else}
			<a href="/login" class="btn btn-primary btn-sm">登录后涂鸦</a>
		{/if}
	</div>
	{#if data.user}
		<canvas
			bind:this={canvas}
			width={1200}
			height={600}
			class="board-canvas"
			onpointerdown={start}
			onpointermove={move}
			onpointerup={end}
			onpointerleave={end}
		></canvas>
		<div class="wall-meta">
			{data.editor
				? `🧑‍🎨 最后涂鸦：${data.editor} · ${fmtTime(data.updatedAt)}`
				: '🆕 画布还是空白，来画第一笔吧！'}
		</div>
	{:else}
		<div class="card empty" style="margin:0;">
			<div class="empty-icon">🔒</div>
			<p>登录后即可在共享画布上涂鸦</p>
			<div class="mt-16"><a href="/login" class="btn btn-primary">登录</a></div>
		</div>
	{/if}
	{#if saveError}<div class="form-error" style="margin-top:8px;">{saveError}</div>{/if}
	{#if saveOk}<div class="form-success" style="margin-top:8px;">{saveOk}</div>{/if}
</section>

<style>
	.board-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 16px;
	}
	.board-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}
	.tool-group {
		display: flex;
		align-items: center;
		gap: 6px;
		padding-right: 10px;
		border-right: 1px solid var(--border);
	}
	.color-dot {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.color-dot.active {
		border-color: var(--text);
		transform: scale(1.15);
	}
	.size-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--border);
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.size-dot span {
		display: block;
		background: var(--text);
		border-radius: 50%;
	}
	.size-dot.active {
		border-color: var(--accent);
	}
	.board-canvas {
		width: 100%;
		height: auto;
		max-height: 600px;
		background: #fff;
		border: 1px solid var(--border);
		border-radius: 10px;
		touch-action: none;
		cursor: crosshair;
	}
	.wall-meta {
		margin-top: 10px;
		color: var(--text-secondary);
		font-size: 13px;
	}
	.mt-16 {
		margin-top: 16px;
	}
</style>
