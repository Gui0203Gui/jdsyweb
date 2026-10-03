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
				<span class="brand-logo">🏫</span>
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
				<form action="/search" method="get" class="search-form">
					<input type="search" name="q" placeholder="搜索帖子…" class="search-input" />
				</form>
				{#if data.user}
					<a href="/works" class="btn btn-ghost btn-sm">🎨 作品集</a>
					{#if data.user.signedToday}
						<span class="btn btn-ghost btn-sm" title="今天已签到">✅ 已签到</span>
					{:else}
						<a href="/signin" class="btn btn-ghost btn-sm">📅 签到</a>
					{/if}
					<a href="/post/new" class="btn btn-primary btn-sm">发帖</a>
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
						<span class="avatar">{data.user.avatar || '👤'}</span>
						{data.user.username}
						<span class="points-chip">⭐ {data.user.points}</span>
					</a>
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
