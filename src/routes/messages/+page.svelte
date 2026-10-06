<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();
	let draft = $state('');
	let activePeer = $state<string | null>(data.peer?.username ?? null);
	let messages = $state(data.messages);

	function selectPeer(username: string) {
		activePeer = username;
		window.location.href = `/messages?to=${encodeURIComponent(username)}`;
	}

	function fmtTime(ts: Date | number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
	}
</script>

<svelte:head>
	<title>私信 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">✉️ 私信</h1>

{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<div class="messages-layout">
	<!-- 会话列表 -->
	<aside class="conversation-list">
		<h2 class="section-title" style="font-size:14px;">会话</h2>
		{#each data.conversations as conv (conv.other.id)}
			<button
				type="button"
				class="conversation-item {conv.other.username === data.peer?.username ? 'active' : ''}"
				onclick={() => selectPeer(conv.other.username)}
			>
				<span class="conversation-name">
					{conv.other.username}
					{#if conv.unread > 0}<span class="bell-badge" style="position:static;margin-left:6px;"
							>{conv.unread}</span
						>{/if}
				</span>
				<span class="conversation-preview">
					{conv.lastMessage?.content ?? '暂无消息'}
				</span>
			</button>
		{:else}
			<p class="text-secondary" style="font-size:13px;padding:8px;">
				还没有私信会话，去别人主页发一条吧
			</p>
		{/each}
	</aside>

	<!-- 聊天窗口 -->
	<section class="chat-window">
		{#if data.peer}
			<div class="chat-header">与 {data.peer.username} 的对话</div>
			<div class="chat-body">
				{#each messages as m (m.id)}
					<div class="chat-msg {m.senderId === data.user?.id ? 'mine' : 'theirs'}">
						<span class="chat-msg-content">{m.content}</span>
						<span class="chat-msg-time">{fmtTime(m.createdAt)}</span>
					</div>
				{:else}
					<p class="text-secondary" style="text-align:center;padding:24px;font-size:13px;">
						还没有消息，打个招呼吧～
					</p>
				{/each}
			</div>
			<form method="post" action="?/send" use:enhance class="chat-input-row">
				<input type="hidden" name="to" value={data.peer.username} />
				<input
					type="text"
					name="content"
					class="form-input"
					placeholder="输入私信内容…"
					maxlength="2000"
					bind:value={draft}
					required
				/>
				<button type="submit" class="btn btn-primary btn-sm" disabled={draft.trim().length === 0}
					>发送</button
				>
			</form>
		{:else}
			<div class="chat-empty">
				<p>选择左侧会话，或去某位吧友的主页点击「发私信」开始聊天</p>
			</div>
		{/if}
	</section>
</div>
