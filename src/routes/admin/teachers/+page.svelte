<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import { avatarUrl } from '#lib/avatar';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>老师审批 - 交大实验网管理后台</title>
</svelte:head>

<div class="admin-tabs">
	<a href="/admin" class="btn btn-ghost btn-sm">帖子管理</a>
	<a href="/admin/users" class="btn btn-ghost btn-sm">用户管理</a>
	<a href="/admin/teachers" class="btn btn-primary btn-sm">老师审批</a>
	<a href="/admin/reports" class="btn btn-ghost btn-sm">举报处理</a>
	<a href="/admin/announcements" class="btn btn-ghost btn-sm">公告管理</a>
</div>

<h1 class="page-title" style="margin-top:16px;">👨‍🏫 老师审批</h1>

{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<div class="card">
	<table class="admin-table">
		<thead>
			<tr>
				<th>照片</th>
				<th>姓名</th>
				<th>简介</th>
				<th>上传者</th>
				<th>提交时间</th>
				<th>操作</th>
			</tr>
		</thead>
		<tbody>
			{#each data.pending as row (row.teacher.id)}
				<tr>
					<td>
						{#if avatarUrl(row.teacher.avatar)}
							<span class="avatar" style="width:36px;height:36px;font-size:18px;"
								><img src={avatarUrl(row.teacher.avatar)} alt={row.teacher.name} /></span
							>
						{:else}
							<span class="avatar" style="width:36px;height:36px;font-size:18px;">🧑‍🏫</span>
						{/if}
					</td>
					<td><strong>{row.teacher.name}</strong></td>
					<td style="max-width:220px;color:var(--text-secondary);">
						{row.teacher.description || '—'}
					</td>
					<td>
						<a href={`/user/${row.submitter.username}`}>{row.submitter.username}</a>
					</td>
					<td>{new Date(row.teacher.createdAt).toLocaleString()}</td>
					<td>
						<div class="row-actions">
							<form method="post" action="?/approve" use:enhance>
								<input type="hidden" name="id" value={row.teacher.id} />
								<button type="submit" class="mini-btn">通过</button>
							</form>
							<form method="post" action="?/reject" use:enhance>
								<input type="hidden" name="id" value={row.teacher.id} />
								<button type="submit" class="mini-btn danger">驳回</button>
							</form>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">
						暂无待审核的老师
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
