<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import {
    connect, send, respondToApproval,
    messages, capabilities, pendingApproval, isThinking, isConnected,
  } from '$lib/websocket.svelte'
  import Message        from '$lib/components/Message.svelte'
  import ApprovalCard   from '$lib/components/ApprovalCard.svelte'
  import CapabilityItem from '$lib/components/CapabilityItem.svelte'

  const tenantSlug = $page.params.tenant

  let input      = $state('')
  let messagesEl = $state<HTMLElement | undefined>(undefined)

  onMount(() => connect())

  $effect(() => {
    messages.length  // track changes
    setTimeout(() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }), 50)
  })

  function handleSend() {
    if (!input.trim() || isThinking || pendingApproval) return
    send(input)
    input = ''
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }
</script>

<div class="flex h-screen bg-white dark:bg-gray-950 overflow-hidden">

  <!-- LEFT: Chat panel -->
  <div class="flex flex-col flex-[1.4] border-r border-gray-200 dark:border-gray-800 min-w-0">

    <!-- Header -->
    <div class="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
      <div class="w-2 h-2 rounded-full {isConnected ? 'bg-green-500' : 'bg-gray-300'}"></div>
      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{tenantSlug}</span>
    </div>

    <!-- Messages -->
    <div
      bind:this={messagesEl}
      class="flex-1 overflow-y-auto px-5 py-4 space-y-3"
    >
      {#each messages as msg (msg.id)}
        <Message {msg} />
      {/each}

      {#if pendingApproval}
        <ApprovalCard
          event={pendingApproval}
          onApprove={() => respondToApproval(pendingApproval!.approvalId, true)}
          onCancel={()  => respondToApproval(pendingApproval!.approvalId, false)}
        />
      {/if}
    </div>

    <!-- Input -->
    <div class="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800">
      <div class="flex items-end gap-2 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 focus-within:border-violet-400 transition-colors">
        <textarea
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder={pendingApproval ? 'Waiting for your response above...' : 'Ask anything or give an instruction...'}
          disabled={!!pendingApproval}
          rows="1"
          class="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none outline-none disabled:opacity-50"
          style="min-height: 24px; max-height: 120px;"
        ></textarea>
        <button
          onclick={handleSend}
          disabled={!input.trim() || isThinking || !!pendingApproval}
          class="flex-shrink-0 bg-violet-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-violet-700 transition-colors"
        >
          Send
        </button>
      </div>
      <p class="text-xs text-gray-400 mt-1.5 px-1">Press Enter to send · Shift+Enter for new line</p>
    </div>
  </div>

  <!-- RIGHT: Capabilities panel -->
  <div class="w-72 flex flex-col bg-gray-50 dark:bg-gray-900 flex-shrink-0">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">What I can do</h2>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3 space-y-2">
      {#each capabilities as cap (cap.name)}
        <CapabilityItem {cap} onuse={(prompt) => { input = prompt }} />
      {/each}

      {#if capabilities.length === 0}
        <p class="text-xs text-gray-400 px-1 py-2">Connecting...</p>
      {/if}
    </div>

    <div class="px-3 pb-4">
      <button class="w-full text-xs text-violet-600 border border-violet-200 dark:border-violet-800 rounded-lg py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
        + Connect more apps
      </button>
    </div>
  </div>

</div>
