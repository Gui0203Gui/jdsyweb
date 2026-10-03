<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>登录 - 交大实验网</title>
</svelte:head>

<div style="max-width: 420px; margin: 40px auto;">
	<div class="card">
		<h1 class="page-title" style="text-align: center;">登录</h1>

		{#if form?.error}
			<div class="form-error">{form.error}</div>
		{/if}

		<form method="post" use:enhance>
			<div class="form-group">
				<label class="form-label" for="username">用户名</label>
				<input
					type="text"
					name="username"
					id="username"
					class="form-input"
					placeholder="请输入用户名"
					required
				/>
			</div>

			<div class="form-group">
				<label class="form-label" for="password">密码</label>
				<input
					type="password"
					name="password"
					id="password"
					class="form-input"
					placeholder="请输入密码"
					required
				/>
			</div>

			<button type="submit" class="btn btn-primary btn-block">登录</button>
		</form>

		<p class="mt-16 text-secondary" style="text-align: center; font-size: 14px;">
			还没有账号？<a href="/register">去注册</a>
		</p>
	</div>
</div>
