<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: PageProps = $props();

	function fmtDate(ts: Date | number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>用户管理 - 交大实验网</title>
</svelte:head>

<h1 class="page-title">🛡️ 管理后台</h1>

<div class="admin-tabs">
	<a href="/admin" class="btn btn-ghost btn-sm">帖子管理</a>
	<a href="/admin/users" class="btn btn-primary btn-sm">用户管理</a>
</div>

{#if form?.error}
	<div class="form-error">{form.error}</div>
{/if}

<div class="card">
	<table class="admin-table">
		<thead>
			<tr>
				<th>用户名</th>
				<th>角色</th>
				<th>积分</th>
				<th>注册日期</th>
				<th>状态</th>
				<th>操作</th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as u (u.id)}
				<tr>
					<td>
						<a href={`/user/${u.username}`}>
							<span class="avatar" style="width:22px;height:22px;font-size:12px;margin-right:6px;">
								{u.avatar || '👤'}
							</span>
							{u.username}
						</a>
					</td>
					<td>
						{#if u.role === 'admin'}<span class="tag admin">管理员</span>{:else}<span class="tag"
								>吧友</span
							>{/if}
					</td>
					<td>⭐ {u.points}</td>
					<td>{fmtDate(u.createdAt)}</td>
					<td>
						{#if u.isBanned}<span class="tag banned">已封禁</span>{:else}<span class="tag"
								>正常</span
							>{/if}
					</td>
					<td>
						<div class="row-actions">
							{#if u.isBanned}
								<form method="post" action="?/unban" use:enhance>
									<input type="hidden" name="id" value={u.id} />
									<button type="submit" class="mini-btn">解封</button>
								</form>
							{:else}
								<form method="post" action="?/ban" use:enhance>
									<input type="hidden" name="id" value={u.id} />
									<button type="submit" class="mini-btn danger">封禁</button>
								</form>
							{/if}
							{#if u.role === 'admin'}
								<form method="post" action="?/unadmin" use:enhance>
									<input type="hidden" name="id" value={u.id} />
									<button type="submit" class="mini-btn">取消管理员</button>
								</form>
							{:else}
								<form method="post" action="?/admin" use:enhance>
									<input type="hidden" name="id" value={u.id} />
									<button type="submit" class="mini-btn">设为管理员</button>
								</form>
							{/if}
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">
						暂无用户
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
