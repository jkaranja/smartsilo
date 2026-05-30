<script lang="ts">
  import type { Capability } from '$lib/types'

  let { cap, onuse }: { cap: Capability; onuse: (prompt: string) => void } = $props()
</script>

<button
  onclick={() => onuse(cap.name.replace(/_/g, ' '))}
  class="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
>
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <div class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
        {cap.name.replace(/_/g, ' ')}
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
        {cap.description}
      </div>
    </div>
  </div>
  <div class="flex gap-1.5 mt-1.5 flex-wrap">
    <span class="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
      {cap.source}
    </span>
    {#if cap.needsApproval}
      <span class="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
        needs approval
      </span>
    {/if}
  </div>
</button>
