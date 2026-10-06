<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();

	const TYPE_ICONS: Record<string, string> = {
		reply: '💬',
		like: '👍',
		favorite: '🔖',
		system: '📢',
		mention: '📣',
		gift: '🌷',
		follow: '➕'
	};

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
			d.getMinutes()
		)}`;
	}
</script>

<svelte:head>
	<title>消息通知 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🔔 消息通知</h1>

<div class="flex-between mb-16">
	<p class="text-secondary" style="font-size:14px;">
		共 {data.notifications.length} 条通知
	</p>
	{#if data.notifications.length > 0}
		<form method="post" action="?/markRead" use:enhance>
			<button type="submit" class="btn btn-ghost btn-sm">全部标为已读</button>
		</form>
	{/if}
</div>

{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<ul class="notif-list">
	{#each data.notifications as n (n.id)}
		<li class="notif-item {n.isRead ? '' : 'unread'}">
			<span class="notif-icon">{TYPE_ICONS[n.type] ?? '📩'}</span>
			<div class="notif-body">
				<div class="notif-content">
					{#if n.refId && n.type !== 'system'}
						<a href={`/post/${n.refId}`}>{n.content}</a>
					{:else}
						{n.content}
					{/if}
				</div>
				<div class="notif-time">
					{fmtDate(n.createdAt)}
					{#if !n.isRead}<span style="color:var(--primary);"> · 未读</span>{/if}
				</div>
			</div>
		</li>
	{:else}
		<div class="empty">
			<div class="empty-icon">📭</div>
			暂无通知
		</div>
	{/each}
</ul>
