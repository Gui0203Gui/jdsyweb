<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}

	function avatarUrl(key: string): string {
		return key ? `/api/img/${key}` : '';
	}
</script>

<svelte:head>
	<title>积分排行榜 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🏆 积分排行榜</h1>

{#if data.myRank}
	<div class="card mb-16">
		<div class="flex-between">
			<span>我的排名</span>
			<b style="font-size:18px;color:var(--primary);">第 {data.myRank} 名</b>
		</div>
	</div>
{/if}

<ul class="rank-list">
	{#each data.board as row, i (row.user.id)}
		<li class="rank-item {row.user.id === data.myUserId ? 'rank-self' : ''}">
			<span class="rank-no">{i + 1}</span>
			<div class="rank-user">
				{#if avatarUrl(row.user.avatar)}
					<span class="avatar" style="width:34px;height:34px;font-size:16px;">
						<img
							src={avatarUrl(row.user.avatar)}
							alt="头像"
							style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
						/>
					</span>
				{:else}
					<span class="avatar" style="width:34px;height:34px;font-size:16px;">👤</span>
				{/if}
				<div style="min-width:0;">
					<a href={`/user/${row.user.username}`} style="font-weight:600;">
						{row.user.username}
					</a>
					{#if row.user.badge}<span class="user-badge" style="margin-left:6px;"
							>【{row.user.badge}】</span
						>{/if}
					{#if row.user.role === 'admin'}
						<span class="tag admin" style="margin-left:6px;">管理员</span>
					{/if}
					<div class="text-secondary" style="font-size:12px;">
						📅 {fmtDate(row.user.createdAt)} · 📝 {row.postCount} 帖
					</div>
				</div>
			</div>
			<span class="rank-points">⭐ {row.user.points}</span>
		</li>
	{:else}
		<div class="empty">
			<div class="empty-icon">🏆</div>
			暂无排行数据
		</div>
	{/each}
</ul>
