<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();

	function fmtTime(ts: Date | number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
	}

	// ---- 画板状态 ----
	let canvas = $state<HTMLCanvasElement | null>(null);
	let ctx: CanvasRenderingContext2D | null = null;
	let drawing = $state(false);
	let color = $state('#e63946');
	let size = $state(6);
	let tool = $state<'brush' | 'eraser'>('brush');
	let uploading = $state(false);
	let uploadError = $state('');
	let uploadOk = $state('');
	let lastPos: { x: number; y: number } | null = null;

	function ensureCanvas() {
		if (!canvas || ctx) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	}

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

	async function submit() {
		if (!canvas || uploading) return;
		uploading = true;
		uploadError = '';
		uploadOk = '';
		try {
			const dataUrl = canvas.toDataURL('image/png');
			const res = await fetch('/api/graffiti', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: dataUrl })
			});
			const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
			if (!res.ok || !j.ok) {
				uploadError = j.error ?? '上传失败';
			} else {
				uploadOk = '已发布到涂鸦墙！';
				clearCanvas();
				setTimeout(() => location.reload(), 500);
			}
		} catch {
			uploadError = '上传失败，请重试';
		} finally {
			uploading = false;
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
	想画什么就画什么！画完发布到墙上；任何人都可以「擦掉」墙上的涂鸦（包括别人画的）。
</p>

{#if form?.success}
	<div class="form-success">{form.success}</div>
{/if}
{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<!-- 大画板 -->
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
			<button type="button" class="btn btn-primary btn-sm" onclick={submit} disabled={uploading}>
				{uploading ? '发布中…' : '📤 发布到涂鸦墙'}
			</button>
		{:else}
			<a href="/login" class="btn btn-primary btn-sm">登录后涂鸦</a>
		{/if}
	</div>
	{#if data.user}
		<canvas
			bind:this={canvas}
			width={1100}
			height={560}
			class="board-canvas"
			onpointerdown={start}
			onpointermove={move}
			onpointerup={end}
			onpointerleave={end}
		></canvas>
		<p class="form-hint">用鼠标/手指在白色画布上作画（宽度 1100px，大画布）</p>
	{:else}
		<div class="card empty" style="margin:0;">
			<div class="empty-icon">🔒</div>
			<p>登录后即可在涂鸦墙作画</p>
			<div class="mt-16"><a href="/login" class="btn btn-primary">登录</a></div>
		</div>
	{/if}
	{#if uploadError}<div class="form-error" style="margin-top:8px;">{uploadError}</div>{/if}
	{#if uploadOk}<div class="form-success" style="margin-top:8px;">{uploadOk}</div>{/if}
</section>

<!-- 涂鸦墙 -->
<section>
	<h2 class="section-title">🧱 涂鸦墙（{data.graffiti.length}）</h2>
	{#if data.graffiti.length === 0}
		<div class="card empty">
			<div class="empty-icon">🖌️</div>
			<p>还没有涂鸦，来画第一张！</p>
		</div>
	{:else}
		<div class="graffiti-grid">
			{#each data.graffiti as g (g.id)}
				<figure class="graffiti-card">
					<img src={`/api/img/${g.imageKey}`} alt={`${g.author} 的涂鸦`} class="graffiti-img" />
					<figcaption>
						<span class="graffiti-author">✍️ {g.author}</span>
						<span class="graffiti-time">{fmtTime(g.createdAt)}</span>
						{#if data.user}
							<form method="post" action="?/erase" use:enhance style="display:inline;">
								<input type="hidden" name="id" value={g.id} />
								<button type="submit" class="mini-btn danger">🧽 擦除</button>
							</form>
						{/if}
					</figcaption>
				</figure>
			{/each}
		</div>
	{/if}
</section>

<style>
	.board-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 16px;
		margin-bottom: 24px;
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
		max-height: 560px;
		background: #fff;
		border: 1px solid var(--border);
		border-radius: 10px;
		touch-action: none;
		cursor: crosshair;
	}
	.graffiti-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 16px;
	}
	.graffiti-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px;
		margin: 0;
	}
	.graffiti-img {
		width: 100%;
		height: auto;
		background: #fff;
		border-radius: 8px;
		display: block;
	}
	.graffiti-card figcaption {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		font-size: 13px;
	}
	.graffiti-author {
		font-weight: 600;
	}
	.graffiti-time {
		color: var(--text-secondary);
		flex: 1;
	}
	.mt-16 {
		margin-top: 16px;
	}
</style>
