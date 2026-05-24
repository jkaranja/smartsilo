<script lang="ts">
  import type { ApprovalEvent } from '$lib/types'

  let { event, onApprove, onCancel }: {
    event:     ApprovalEvent
    onApprove: () => void
    onCancel:  () => void
  } = $props()
</script>

<div class="flex justify-start">
  <div class="max-w-[85%] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl rounded-bl-sm px-4 py-3">
    <div class="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wider">
      Confirm action
    </div>
    <div class="text-sm text-gray-900 dark:text-gray-100 mb-3">
      {event.description}
    </div>
    <div class="flex gap-2">
      <button
        onclick={onCancel}
        class="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Cancel
      </button>
      <button
        onclick={onApprove}
        class="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
      >
        Approve
      </button>
    </div>
  </div>
</div>
