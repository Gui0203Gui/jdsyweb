<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data }: PageProps = $props();

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
			d.getMinutes()
		)}`;
	}
</script>

<svelte:head>
	<title>举报处理 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🚩 举报处理</h1>

<div class="admin-tabs">
	<a href="/admin" class="btn btn-ghost btn-sm">帖子管理</a>
	<a href="/admin/users" class="btn btn-ghost btn-sm">用户管理</a>
	<a href="/admin/teachers" class="btn btn-ghost btn-sm">老师审批</a>
	<a href="/admin/reports" class="btn btn-primary btn-sm">举报处理</a>
	<a href="/admin/announcements" class="btn btn-ghost btn-sm">公告管理</a>
</div>

<div class="card mt-16">
	<table class="admin-table">
		<thead>
			<tr>
				<th>时间</th>
				<th>举报人</th>
				<th>目标</th>
				<th>理由</th>
				<th>操作</th>
			</tr>
		</thead>
		<tbody>
			{#each data.reports as row (row.report.id)}
				<tr>
					<td style="white-space:nowrap;">{fmtDate(row.report.createdAt)}</td>
					<td>
						<a href={`/user/${row.reporter.username}`}>{row.reporter.username}</a>
					</td>
					<td style="max-width:300px;">
						{#if row.target}
							<span class="tag">{row.target.type}</span>
							<div style="font-size:13px;margin-top:4px;">
								{#if row.target.title}<b>{row.target.title}</b><br />{/if}
								{row.target.content.slice(0, 80)}{row.target.content.length > 80 ? '…' : ''}
							</div>
							<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
								目标作者：{row.target.authorName}
							</div>
						{:else}
							<span class="tag deleted">目标已删除</span>
						{/if}
					</td>
					<td style="max-width:200px;font-size:13px;">{row.report.reason}</td>
					<td>
						<div class="row-actions">
							<form method="post" action="?/resolve" use:enhance>
								<input type="hidden" name="id" value={row.report.id} />
								<button type="submit" class="mini-btn">已处理</button>
							</form>
							<form method="post" action="?/dismiss" use:enhance>
								<input type="hidden" name="id" value={row.report.id} />
								<button type="submit" class="mini-btn">驳回</button>
							</form>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">
						暂无待处理举报
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
