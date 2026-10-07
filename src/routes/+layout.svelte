<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { avatarUrl } from '#lib/avatar';
	import LevelChip from '#lib/components/LevelChip.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	$effect(() => {
		document.title = '交大实验网 - 民间贴吧';
	});

	// 深色模式（D4）：初始读取 localStorage，切换后写入并更新 data-theme
	let theme = $state<'light' | 'dark'>('light');

	$effect(() => {
		const saved = localStorage.getItem('jdsy_theme');
		if (saved === 'dark') theme = 'dark';
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		localStorage.setItem('jdsy_theme', theme);
	}

	// 移动端菜单开关
	let menuOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="site">
	<header class="topbar">
		<div class="topbar-inner">
			<a href="/" class="brand">
				<span class="brand-logo">🏫</span>
				<span class="brand-name">交大实验网</span>
				<span class="brand-tag">民间贴吧</span>
			</a>

			<div class="topbar-actions" class:open={menuOpen}>
				<form action="/search" method="get" class="search-form">
					<input type="search" name="q" placeholder="搜索帖子…" class="search-input" />
				</form>
				{#if data.user}
					<a href="/works" class="btn btn-ghost btn-sm">🎨 作品集</a>
					<a href="/games" class="btn btn-ghost btn-sm">⛏️ 交大工坊</a>
					{#if data.user.signedToday}
						<span class="btn btn-ghost btn-sm" title="今天已签到">✅ 已签到</span>
					{:else}
						<a href="/signin" class="btn btn-ghost btn-sm">📅 签到</a>
					{/if}
					<a href="/post/new" class="btn btn-primary btn-sm">发帖</a>
					<a href="/messages" class="bell-link" title="私信" style="margin-right:4px;">
						✉️
						{#if data.user.unreadMessages > 0}
							<span class="bell-badge"
								>{data.user.unreadMessages > 99 ? '99+' : data.user.unreadMessages}</span
							>
						{/if}
					</a>
					<a href="/notifications" class="bell-link" title="消息通知">
						🔔
						{#if data.user.unreadCount > 0}
							<span class="bell-badge"
								>{data.user.unreadCount > 99 ? '99+' : data.user.unreadCount}</span
							>
						{/if}
					</a>
					{#if data.user.role === 'admin'}
						<a href="/admin" class="btn btn-ghost btn-sm">🛡️ 管理</a>
					{/if}
					<a
						href="/me"
						class="user-chip"
						title={`${data.user.username}（${data.user.role === 'admin' ? '管理员' : '吧友'}）`}
					>
						{#if avatarUrl(data.user.avatar)}
							<span class="avatar"
								><img src={avatarUrl(data.user.avatar)} alt={data.user.username} /></span
							>
						{:else}
							<span class="avatar">👤</span>
						{/if}
						{data.user.username}
						<LevelChip points={data.user.points} />
						<span class="points-chip">⭐ {data.user.points}</span>
					</a>
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={toggleTheme}
						title="切换深色/浅色模式"
					>
						{theme === 'dark' ? '🌙' : '☀️'}
					</button>
					<form method="post" action="/logout">
						<button type="submit" class="btn btn-ghost btn-sm">登出</button>
					</form>
				{:else}
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={toggleTheme}
						title="切换深色/浅色模式"
					>
						{theme === 'dark' ? '🌙' : '☀️'}
					</button>
					<a href="/login" class="btn btn-ghost btn-sm">登录</a>
					<a href="/register" class="btn btn-primary btn-sm">注册</a>
				{/if}
			</div>

			<button
				type="button"
				class="menu-btn"
				onclick={() => (menuOpen = !menuOpen)}
				aria-label="菜单"
			>
				{menuOpen ? '✕' : '☰'}
			</button>
		</div>
	</header>

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<p>交大实验网 · 民间非官方贴吧 · 内容由吧友自发发布</p>
	</footer>
</div>
