<script lang="ts">
  type Msg = {
    id: string;
    role: 'user' | 'agent' | 'activity';
    content?: string;
    thinking?: boolean;
    toolName?: string;
    toolDone?: boolean;
    isError?: boolean;
  };

  type Cap = {
    label: string;
    description: string;
    source: string;
    icon: string;
    prompt: string;
    needsApproval?: boolean;
  };

  const MOCK: Msg[] = [
    { id: '1', role: 'user', content: 'Show me all open work orders this week' },
    { id: '2', role: 'activity', toolName: 'list_work_orders', toolDone: true },
    {
      id: '3',
      role: 'agent',
      content: `Found **14 open work orders** this week.

**High priority (3)** — Engine diagnostics on BMW 5-Series, brake replacement on Ford F-150, transmission rebuild on Chevy Silverado.

**In progress (8)** — Routine oil changes, tire rotations, filter replacements across various vehicles.

**Waiting on parts (3)** — Toyota Camry timing belt kit, Honda Civic catalytic converter, Jeep Wrangler lift kit.

Want me to sort by priority, assign to available technicians, or send follow-ups on the parts orders?`,
    },
    { id: '4', role: 'user', content: 'Who has the most work assigned right now?' },
    { id: '5', role: 'activity', toolName: 'get_technician_workload', toolDone: false },
    { id: '6', role: 'agent', thinking: true, toolName: 'Checking technician workload' },
  ];

  const CAPS: Cap[] = [
    {
      label: 'Work orders',
      description: 'View, filter, and manage open service jobs',
      source: 'Garage',
      icon: '🔧',
      prompt: 'Show all open work orders this week',
    },
    {
      label: 'New work order',
      description: 'Open a new service job for any vehicle',
      source: 'Garage',
      icon: '📋',
      prompt: 'Create a new work order for',
    },
    {
      label: 'Parts inventory',
      description: 'Check stock levels, reorder points, and costs',
      source: 'Garage',
      icon: '📦',
      prompt: 'Which parts are running low on stock?',
    },
    {
      label: 'Customers',
      description: 'Browse records, service history, and contacts',
      source: 'Garage',
      icon: '👥',
      prompt: 'Show customers with service due this month',
    },
    {
      label: 'Appointments',
      description: 'View and schedule drop-offs or service visits',
      source: 'Garage',
      icon: '📅',
      prompt: "List all of today's appointments",
    },
    {
      label: 'Technician load',
      description: 'Check workload distribution across your team',
      source: 'Garage',
      icon: '👷',
      prompt: 'Who has the most work assigned right now?',
    },
    {
      label: 'Send email',
      description: 'Draft and send emails to customers or staff',
      source: 'Gmail',
      icon: '✉️',
      prompt: 'Draft a service reminder email for',
      needsApproval: true,
    },
    {
      label: 'Search inbox',
      description: 'Find emails from customers or suppliers',
      source: 'Gmail',
      icon: '🔍',
      prompt: 'Search my inbox for emails from',
    },
  ];

  const STARTERS = [
    { text: 'Summarize open work orders', icon: '🔧', sub: 'Jobs overview' },
    { text: 'Which parts need reordering?', icon: '📦', sub: 'Inventory check' },
    { text: "List today's appointments", icon: '📅', sub: 'Daily schedule' },
    { text: "Show this week's revenue", icon: '📊', sub: 'Revenue summary' },
  ];

  const SOURCES = ['Garage', 'Gmail'];

  // ── Prototype state ─────────────────────────────────────────
  let showEmpty = $state(false);
  let input = $state('');
  let sidebarOpen = $state(true);
  let messages = $state<Msg[]>(MOCK);
  let el = $state<HTMLElement | null>(null);

  $effect(() => {
    messages.length;
    setTimeout(() => el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 40);
  });

  function send() {
    const text = input.trim();
    if (!text) return;
    messages = [...messages, { id: crypto.randomUUID(), role: 'user', content: text }];
    input = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function usePrompt(text: string) {
    input = text;
  }

  function bold(line: string) {
    return line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
</script>

<div class="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">

  <!-- ── Top nav ──────────────────────────────────────────────── -->
  <header class="relative z-10 flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/95 px-5 backdrop-blur-sm">

    <!-- Logo -->
    <div class="flex items-center gap-2.5">
      <div class="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
        <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      </div>
      <span class="text-sm font-semibold tracking-tight text-zinc-100">SmartSilo</span>
      <span class="text-zinc-700">/</span>
      <span class="text-sm text-zinc-500">Agent</span>
    </div>

    <!-- Org pill -->
    <button class="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.07]">
      <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153/0.8)]"></span>
      Riverside Auto
      <svg class="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Right actions -->
    <div class="flex items-center gap-2">
      <!-- Prototype toggle -->
      <button
        onclick={() => { showEmpty = !showEmpty; }}
        class="rounded-lg border border-white/[0.07] px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >{showEmpty ? 'Show chat' : 'Empty state'}</button>

      <!-- New chat -->
      <button class="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-zinc-200">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New
      </button>

      <!-- Sidebar toggle -->
      <button
        onclick={() => { sidebarOpen = !sidebarOpen; }}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
        aria-label="Toggle tools panel"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      </button>

      <!-- Avatar -->
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow">
        JK
      </div>
    </div>
  </header>

  <!-- ── Body ─────────────────────────────────────────────────── -->
  <div class="flex min-h-0 flex-1 overflow-hidden">

    <!-- ── Main chat area ──────────────────────────────────────── -->
    <main class="flex min-w-0 flex-1 flex-col">

      {#if showEmpty}
        <!-- ─── Empty / welcome state ─────────────────────────── -->
        <div
          class="flex flex-1 flex-col items-center justify-center gap-10 overflow-y-auto px-6 py-12"
          style="background: radial-gradient(ellipse 80% 55% at 50% -5%, rgba(99,102,241,0.12) 0%, transparent 65%);"
        >
          <!-- Orb + greeting -->
          <div class="text-center">
            <div
              class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600"
              style="box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 20px 60px rgba(99,102,241,0.4), 0 0 80px rgba(139,92,246,0.15);"
            >
              <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-zinc-100">What can I help you with?</h1>
            <p class="mt-2 text-sm text-zinc-500">
              Connected to <span class="text-zinc-400">Riverside Auto</span> · Garage management · 8 tools ready
            </p>
          </div>

          <!-- Starter prompts -->
          <div class="grid w-full max-w-[480px] grid-cols-2 gap-2.5">
            {#each STARTERS as s}
              <button
                onclick={() => usePrompt(s.text)}
                class="group flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 text-left transition-all duration-150 hover:border-white/[0.12] hover:bg-white/[0.06]"
              >
                <span class="text-xl">{s.icon}</span>
                <div>
                  <p class="text-sm font-medium leading-snug text-zinc-200 transition-colors group-hover:text-white">
                    {s.text}
                  </p>
                  <p class="mt-1 text-xs text-zinc-600">{s.sub}</p>
                </div>
              </button>
            {/each}
          </div>

          <!-- Connected apps hint -->
          <div class="flex items-center gap-3">
            {#each SOURCES as src}
              <span class="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-xs text-zinc-500">
                <span class="h-1 w-1 rounded-full bg-emerald-500"></span>
                {src}
              </span>
            {/each}
            <button class="flex items-center gap-1 rounded-full border border-dashed border-zinc-800 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-indigo-500/40 hover:text-indigo-400">
              + Connect apps
            </button>
          </div>
        </div>

      {:else}
        <!-- ─── Message thread ─────────────────────────────────── -->
        <div
          bind:this={el}
          class="flex-1 overflow-y-auto"
          style="background: radial-gradient(ellipse 60% 35% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 55%);"
        >
          <div class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">

            {#each messages as msg (msg.id)}

              {#if msg.role === 'activity'}
                <!-- Tool activity indicator -->
                <div class="flex justify-center">
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-zinc-500">
                    {#if msg.toolDone}
                      <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"></span>
                      Used
                      <span class="font-medium text-zinc-400">{msg.toolName?.replace(/_/g, ' ')}</span>
                    {:else}
                      <span class="relative flex h-2 w-2 flex-shrink-0">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60"></span>
                        <span class="relative inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
                      </span>
                      Running
                      <span class="font-medium text-zinc-400">{msg.toolName?.replace(/_/g, ' ')}</span>
                    {/if}
                  </span>
                </div>

              {:else if msg.role === 'user'}
                <!-- User message -->
                <div class="flex justify-end">
                  <p class="max-w-[75%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-indigo-950/60">
                    {msg.content}
                  </p>
                </div>

              {:else}
                <!-- Agent message -->
                <div class="flex items-start gap-3">
                  <!-- Avatar -->
                  <div class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow shadow-indigo-500/20">
                    <svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                  </div>

                  <!-- Bubble -->
                  <div class="max-w-[80%] rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-zinc-200 shadow-sm">
                    {#if msg.thinking}
                      <div class="flex items-center gap-2 text-zinc-500">
                        <span class="text-zinc-600">{msg.toolName ?? 'Thinking'}…</span>
                        <span class="flex items-end gap-0.5 pb-px">
                          <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-500" style="animation-delay:0ms"></span>
                          <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-500" style="animation-delay:150ms"></span>
                          <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-500" style="animation-delay:300ms"></span>
                        </span>
                      </div>
                    {:else}
                      {#each (msg.content ?? '').split('\n') as line, i}
                        {#if line === ''}
                          <div class="h-2"></div>
                        {:else}
                          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                          <p class={i > 0 && line !== '' ? 'mt-0.5' : ''}>{@html bold(line)}</p>
                        {/if}
                      {/each}
                    {/if}
                  </div>
                </div>
              {/if}

            {/each}
          </div>
        </div>
      {/if}

      <!-- ─── Input bar ─────────────────────────────────────────── -->
      <div class="relative flex-shrink-0 bg-zinc-950 px-4 pb-5 pt-3">
        <!-- Fade above input -->
        <div class="pointer-events-none absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-zinc-950 to-transparent"></div>

        <div class="mx-auto max-w-2xl">
          <div
            class="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-xl shadow-black/40 transition-all duration-150 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20"
          >
            <textarea
              bind:value={input}
              onkeydown={handleKeydown}
              placeholder="Ask anything or give an instruction…"
              rows={1}
              class="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              style="max-height: 140px; field-sizing: content;"
            ></textarea>

            <div class="flex items-center justify-between px-3 pb-3 pt-1">
              <!-- Left: attached tools -->
              <div class="flex items-center gap-2">
                <button class="flex h-6 w-6 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-white/[0.06] hover:text-zinc-400" title="Attach file">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </button>
                <div class="flex items-center gap-1">
                  <span class="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-600">Garage</span>
                  <span class="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-600">Gmail</span>
                </div>
              </div>

              <!-- Right: send -->
              <button
                onclick={send}
                disabled={!input.trim()}
                class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-900/50 transition-all duration-150 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </div>

          <p class="mt-2 text-center text-[11px] text-zinc-700">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </main>

    <!-- ── Tools sidebar ────────────────────────────────────────── -->
    {#if sidebarOpen}
      <aside
        class="flex w-[264px] flex-shrink-0 flex-col border-l border-white/[0.06] bg-zinc-900/30"
        style="backdrop-filter: blur(2px);"
      >
        <!-- Sidebar header -->
        <div class="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <div>
            <h2 class="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Tools</h2>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
              {CAPS.length}
            </span>
          </div>
        </div>

        <!-- Capabilities grouped by source -->
        <div class="flex-1 overflow-y-auto px-2.5 py-3">
          {#each SOURCES as source}
            <p class="mb-1.5 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 first:mt-0">
              {source}
            </p>
            {#each CAPS.filter((c) => c.source === source) as cap}
              <button
                onclick={() => usePrompt(cap.prompt)}
                class="group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span class="mt-px text-[15px] leading-none">{cap.icon}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <p class="truncate text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-200">
                      {cap.label}
                    </p>
                    {#if cap.needsApproval}
                      <span class="flex-shrink-0 rounded-full bg-amber-500/10 px-1.5 py-px text-[9px] font-medium text-amber-500">
                        approval
                      </span>
                    {/if}
                  </div>
                  <p class="mt-0.5 line-clamp-1 text-[11px] leading-snug text-zinc-600">
                    {cap.description}
                  </p>
                </div>
              </button>
            {/each}
          {/each}
        </div>

        <!-- Connect more -->
        <div class="border-t border-white/[0.06] p-3">
          <button
            class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 py-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-indigo-500/40 hover:text-indigo-400"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Connect more apps
          </button>
        </div>
      </aside>
    {/if}

  </div>
</div>

<style>
  :global(strong) {
    font-weight: 600;
    color: rgb(244 244 245);
  }
</style>
