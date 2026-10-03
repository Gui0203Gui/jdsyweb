<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>注册 - 交大实验网</title>
</svelte:head>

<div style="max-width: 420px; margin: 40px auto;">
	<div class="card">
		<h1 class="page-title" style="text-align: center;">注册账号</h1>

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
					placeholder="2-20 位中文/字母/数字/下划线"
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
					placeholder="至少 6 位"
					minlength="6"
					required
				/>
			</div>

			<div class="form-group">
				<label class="form-label" for="confirm">确认密码</label>
				<input
					type="password"
					name="confirm"
					id="confirm"
					class="form-input"
					placeholder="再次输入密码"
					minlength="6"
					required
				/>
			</div>

			<button type="submit" class="btn btn-primary btn-block">注册</button>
		</form>

		<p class="mt-16 text-secondary" style="text-align: center; font-size: 14px;">
			已有账号？<a href="/login">去登录</a>
		</p>
	</div>
</div>
