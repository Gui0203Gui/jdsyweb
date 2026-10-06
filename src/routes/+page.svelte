<script lang="ts">
	import { badgeCls, badgeShort } from '#lib/flowers';
	import LevelChip from '#lib/components/LevelChip.svelte';
	import type { PageData } from './$types';
	import { formatRelativeTime } from '#lib/time';
	import { avatarUrl } from '#lib/avatar';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>交大实验网 - 首页</title>
</svelte:head>

<div class="flex-between mb-16">
	<h1 class="page-title" style="margin-bottom: 0;">🏫 交大实验网</h1>
	<div class="flex">
		<a href="/hot" class="btn btn-ghost btn-sm">🔥 热门</a>
		<a href="/ranking" class="btn btn-ghost btn-sm">🏆 排行</a>
		<a href="/teachers" class="btn btn-ghost btn-sm">👨‍🏫 老师榜</a>
		<a href="/shop" class="btn btn-ghost btn-sm">🛒 商店</a>
		<a href="/bag" class="btn btn-ghost btn-sm">🎒 背包</a>
		<a href="/festival" class="btn btn-ghost btn-sm">🎁 国庆领花</a>
		<a href="/graffiti" class="btn btn-ghost btn-sm">🎨 涂鸦墙</a>
		{#if data.posts.length === 0}
			<span class="badge">暂无帖子</span>
		{/if}
	</div>
</div>

{#if data.announcements.length > 0}
	<section class="announcement-bar">
		<h2 class="section-title">📢 吧内公告</h2>
		{#each data.announcements as ann (ann.announcement.id)}
			<div class="announcement-item">
				<span class="a-title">📌 {ann.announcement.title}</span>
				<span class="a-content">{ann.announcement.content}</span>
			</div>
		{/each}
	</section>
{/if}

{#if data.forums.length > 0}
	<section class="mb-16">
		<h2 class="section-title">板块导航</h2>
		<div class="forum-grid">
			{#each data.forums as forum (forum.id)}
				<a href={`/forum/${forum.slug}`} class="forum-card">
					<div class="forum-card-icon">{forum.icon}</div>
					<div class="forum-card-name">{forum.name}</div>
					<div class="forum-card-desc">{forum.description || '暂无简介'}</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<section class="mb-16">
	<h2 class="section-title">🧭 站点导航</h2>
	<div class="forum-grid">
		<a
			href="https://www.bilibili.com/"
			target="_blank"
			rel="noopener noreferrer"
			class="forum-card"
		>
			<div class="forum-card-icon">📺</div>
			<div class="forum-card-name">哔哩哔哩</div>
			<div class="forum-card-desc">视频弹幕网站，追番、看视频、找教程</div>
		</a>
		<a
			href="https://afdian.com/a/LTCat"
			target="_blank"
			rel="noopener noreferrer"
			class="forum-card"
		>
			<div class="forum-card-icon">🚀</div>
			<div class="forum-card-name">爱发电 · 龙腾猫跃</div>
			<div class="forum-card-desc">PCL 启动器（PCL2）官方下载主页</div>
		</a>
		<a href="https://automods.cn/hx/" target="_blank" rel="noopener noreferrer" class="forum-card">
			<div class="forum-card-icon">🛠️</div>
			<div class="forum-card-name">AutoMods 我的世界模组</div>
			<div class="forum-card-desc">我的世界 Mod 制作网站</div>
		</a>
		<a href="https://mcjs.link/" target="_blank" rel="noopener noreferrer" class="forum-card">
			<div class="forum-card-icon">🎮</div>
			<div class="forum-card-name">MCJS</div>
			<div class="forum-card-desc">我的世界 JS 网页版入口</div>
		</a>
	</div>
</section>

{#if data.works.length > 0}
	<section class="mb-16">
		<div class="flex-between">
			<h2 class="section-title" style="margin-bottom: 0;">🎨 最新作品</h2>
			<a href="/works" class="btn btn-ghost btn-sm">全部作品 →</a>
		</div>
		<div class="works-grid">
			{#each data.works as item (item.work.id)}
				<a href={`/works/${item.work.id}`} class="work-card">
					<div class="work-card-icon">🖼️</div>
					<div class="work-card-name">{item.work.title}</div>
					{#if item.work.description}
						<div class="work-card-desc">{item.work.description}</div>
					{/if}
					<div class="work-card-meta">
						<span
							>👤 {item.author.username}{#if item.author.badge}
								<span class="user-badge badge-{badgeCls(item.author.badge)}"
									>【{badgeShort(item.author.badge)}】</span
								>{/if}</span
						>
						<span>·</span>
						<span>👁 {item.work.views}</span>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<section>
	<h2 class="section-title">最新帖子</h2>
	{#if data.posts.length === 0}
		<div class="card empty">
			<div class="empty-icon">🌱</div>
			<p>还没有帖子，来发第一帖吧！</p>
			{#if data.user}
				<div class="mt-16">
					<a href="/post/new" class="btn btn-primary">发帖</a>
				</div>
			{:else}
				<div class="mt-16">
					<a href="/register" class="btn btn-primary">注册后发帖</a>
				</div>
			{/if}
		</div>
	{:else}
		<ul class="post-list">
			{#each data.posts as item (item.post.id)}
				<li class="post-item">
					<div class="post-item-top">
						{#if item.post.isPinned}
							<span class="pin-tag">置顶</span>
						{/if}
						<a href={`/post/${item.post.id}`} class="post-title">{item.post.title}</a>
					</div>
					<div class="post-meta">
						{#if avatarUrl(item.author.avatar)}
							<span
								class="avatar"
								style="width:20px;height:20px;font-size:12px;vertical-align:-4px;"
								><img src={avatarUrl(item.author.avatar)} alt={item.author.username} /></span
							>
						{:else}
							<span
								class="avatar"
								style="width:20px;height:20px;font-size:12px;vertical-align:-4px;">👤</span
							>
						{/if}
						<span
							>{item.author.username}
							{#if item.author.badge}<span class="user-badge badge-{badgeCls(item.author.badge)}"
									>【{badgeShort(item.author.badge)}】</span
								>{/if}
							<LevelChip points={item.author.points} /> ⭐{item.author.points}</span
						>
						<span>·</span>
						<span>{formatRelativeTime(item.post.createdAt)}</span>
						<span>·</span>
						<span>💬 {item.commentCount}</span>
						<span>👍 {item.likeCount}</span>
						<span>·</span>
						<span>👁 {item.post.views}</span>
					</div>
				</li>
			{/each}
		</ul>

		{#if data.pageCount > 1}
			<nav class="pagination">
				{#if data.page > 1}
					<a class="page-link" href={`/?page=${data.page - 1}`}>← 上一页</a>
				{/if}
				<span class="page-info">第 {data.page} / {data.pageCount} 页</span>
				{#if data.page < data.pageCount}
					<a class="page-link" href={`/?page=${data.page + 1}`}>下一页 →</a>
				{/if}
			</nav>
		{/if}
	{/if}
</section>
