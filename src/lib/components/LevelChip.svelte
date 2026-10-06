<script lang="ts">
	import { levelForPoints } from '#lib/levels';

	let { points }: { points: number } = $props();
	const level = $derived(levelForPoints(points));
</script>

<span class="level-chip level-{level.level}" title="Lv.{level.level} {level.name}（积分 {points}）">
	{level.icon} Lv.{level.level}
</span>
