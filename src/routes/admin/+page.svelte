<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>管理后台 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🛡️ 管理后台</h1>

<div class="admin-tabs">
	<a href="/admin" class="btn btn-primary btn-sm">帖子管理</a>
	<a href="/admin/users" class="btn btn-ghost btn-sm">用户管理</a>
	<a href="/admin/teachers" class="btn btn-ghost btn-sm">老师审批</a>
	<a href="/admin/reports" class="btn btn-ghost btn-sm">举报处理</a>
	<a href="/admin/announcements" class="btn btn-ghost btn-sm">公告管理</a>
</div>

{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<form action="/admin" method="get" class="flex" style="margin-bottom:16px;">
	<input
		type="search"
		name="q"
		value={data.keyword}
		class="form-input"
		placeholder="按标题筛选帖子…"
		style="max-width:280px;"
	/>
	<button type="submit" class="btn btn-ghost btn-sm">筛选</button>
</form>

<div class="card">
	<table class="admin-table">
		<thead>
			<tr>
				<th>标题</th>
				<th>作者</th>
				<th>板块</th>
				<th>回复</th>
				<th>状态</th>
				<th>操作</th>
			</tr>
		</thead>
		<tbody>
			{#each data.posts as row (row.post.id)}
				<tr>
					<td style="max-width:260px;">
						<a href={`/post/${row.post.id}`} class="post-title" style="font-size:14px;">
							{row.post.title}
						</a>
					</td>
					<td>
						<a href={`/user/${row.author.username}`}>{row.author.username}</a>
					</td>
					<td>
						<span class="tag">{row.forum.name}</span>
					</td>
					<td>{row.commentCount}</td>
					<td>
						{#if row.post.isDeleted}
							<span class="tag deleted">已删除</span>
						{:else}
							{#if row.post.isPinned}<span class="tag pinned">置顶</span>{/if}
							{#if row.post.isLocked}<span class="tag locked">锁定</span>{/if}
							{#if !row.post.isPinned && !row.post.isLocked}<span class="tag">正常</span>{/if}
						{/if}
					</td>
					<td>
						<div class="row-actions">
							{#if row.post.isDeleted}
								<form method="post" action="?/restore" use:enhance>
									<input type="hidden" name="id" value={row.post.id} />
									<button type="submit" class="mini-btn">恢复</button>
								</form>
							{:else}
								{#if row.post.isPinned}
									<form method="post" action="?/unpin" use:enhance>
										<input type="hidden" name="id" value={row.post.id} />
										<button type="submit" class="mini-btn">取消置顶</button>
									</form>
								{:else}
									<form method="post" action="?/pin" use:enhance>
										<input type="hidden" name="id" value={row.post.id} />
										<button type="submit" class="mini-btn">置顶</button>
									</form>
								{/if}
								{#if row.post.isLocked}
									<form method="post" action="?/unlock" use:enhance>
										<input type="hidden" name="id" value={row.post.id} />
										<button type="submit" class="mini-btn">解锁</button>
									</form>
								{:else}
									<form method="post" action="?/lock" use:enhance>
										<input type="hidden" name="id" value={row.post.id} />
										<button type="submit" class="mini-btn">锁定</button>
									</form>
								{/if}
								<form method="post" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={row.post.id} />
									<button type="submit" class="mini-btn danger">删除</button>
								</form>
							{/if}
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">
						暂无帖子
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
