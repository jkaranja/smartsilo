<script lang="ts">
  import type { UIMessage } from '$lib/types'

  let { msg }: { msg: UIMessage } = $props()
</script>

<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
  <div
    class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
      {msg.role === 'user'
        ? 'bg-violet-600 text-white rounded-br-sm'
        : msg.isError
          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-sm'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
      }"
  >
    {#if msg.thinking}
      <div class="flex items-center gap-2 text-gray-400">
        {#if msg.toolName}
          <span>Checking {msg.toolName.replace(/_/g, ' ')}...</span>
        {:else}
          <span>Thinking</span>
        {/if}
        <span class="flex gap-0.5">
          <span class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
          <span class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
          <span class="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
        </span>
      </div>
    {:else}
      {msg.content}
    {/if}
  </div>
</div>
