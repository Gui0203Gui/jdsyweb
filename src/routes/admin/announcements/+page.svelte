<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
			d.getMinutes()
		)}`;
	}
</script>

<svelte:head>
	<title>公告管理 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">📢 公告管理</h1>

<div class="admin-tabs">
	<a href="/admin" class="btn btn-ghost btn-sm">帖子管理</a>
	<a href="/admin/users" class="btn btn-ghost btn-sm">用户管理</a>
	<a href="/admin/teachers" class="btn btn-ghost btn-sm">老师审批</a>
	<a href="/admin/reports" class="btn btn-ghost btn-sm">举报处理</a>
	<a href="/admin/announcements" class="btn btn-primary btn-sm">公告管理</a>
</div>

{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<div class="card mt-16">
	<h2 class="section-title">发布新公告</h2>
	<form method="post" action="?/create" use:enhance>
		<div class="form-group">
			<input
				type="text"
				name="title"
				class="form-input"
				placeholder="公告标题"
				maxlength="60"
				required
			/>
		</div>
		<div class="form-group">
			<textarea
				name="content"
				class="form-textarea"
				placeholder="公告内容（将展示在首页公告栏）"
				maxlength="500"
				style="min-height:80px;"
				required></textarea>
		</div>
		<button type="submit" class="btn btn-primary btn-sm">发布</button>
	</form>
</div>

<div class="card mt-16">
	<table class="admin-table">
		<thead>
			<tr>
				<th>标题</th>
				<th>内容</th>
				<th>发布人</th>
				<th>时间</th>
				<th>状态</th>
				<th>操作</th>
			</tr>
		</thead>
		<tbody>
			{#each data.announcements as row (row.announcement.id)}
				<tr>
					<td style="max-width:180px;"><b>{row.announcement.title}</b></td>
					<td style="max-width:240px;font-size:13px;">{row.announcement.content}</td>
					<td>
						<a href={`/user/${row.author.username}`}>{row.author.username}</a>
					</td>
					<td style="white-space:nowrap;">{fmtDate(row.announcement.createdAt)}</td>
					<td>
						{#if row.announcement.isActive}
							<span class="tag pinned">展示中</span>
						{:else}
							<span class="tag deleted">已隐藏</span>
						{/if}
					</td>
					<td>
						<div class="row-actions">
							{#if row.announcement.isActive}
								<form method="post" action="?/deactivate" use:enhance>
									<input type="hidden" name="id" value={row.announcement.id} />
									<button type="submit" class="mini-btn">隐藏</button>
								</form>
							{:else}
								<form method="post" action="?/activate" use:enhance>
									<input type="hidden" name="id" value={row.announcement.id} />
									<button type="submit" class="mini-btn">展示</button>
								</form>
							{/if}
							<form method="post" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={row.announcement.id} />
								<button type="submit" class="mini-btn danger">删除</button>
							</form>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">
						还没有公告
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
