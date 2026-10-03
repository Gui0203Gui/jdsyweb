<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	$effect(() => {
		document.title = '交大实验网 - 民间贴吧';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="site">
	<header class="topbar">
		<div class="topbar-inner">
			<a href="/" class="brand">
				<span class="brand-logo">🧪</span>
				<span class="brand-name">交大实验网</span>
				<span class="brand-tag">民间贴吧</span>
			</a>

			<nav class="forum-nav">
				{#each data.forums as forum (forum.id)}
					<a href={`/forum/${forum.slug}`} class="forum-link">
						<span class="forum-icon">{forum.icon}</span>
						{forum.name}
					</a>
				{/each}
			</nav>

			<div class="topbar-actions">
				{#if data.user}
					<a href="/post/new" class="btn btn-primary btn-sm">发帖</a>
					<span
						class="user-chip"
						title={`${data.user.username}（${data.user.role === 'admin' ? '管理员' : '吧友'}）`}
					>
						<span class="avatar">{data.user.avatar || '👤'}</span>
						{data.user.username}
					</span>
					<form method="post" action="/logout">
						<button type="submit" class="btn btn-ghost btn-sm">登出</button>
					</form>
				{:else}
					<a href="/login" class="btn btn-ghost btn-sm">登录</a>
					<a href="/register" class="btn btn-primary btn-sm">注册</a>
				{/if}
			</div>
		</div>
	</header>

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<p>交大实验网 · 民间非官方贴吧 · 内容由吧友自发发布</p>
	</footer>
</div>
