<script lang="ts">
  import { onMount } from 'svelte';

  // ── Types ────────────────────────────────────────────────────
  type CardType = 'work-order' | 'parts-alert' | 'technician' | 'followup' | 'appointment';

  type InlineCard = {
    type: CardType;
    data: Record<string, unknown>;
  };

  type Msg = {
    id: string;
    role: 'user' | 'agent';
    content?: string;
    cards?: InlineCard[];
    thinking?: boolean;
    toolName?: string;
  };

  type Suggestion = {
    text: string;
    signal: string; // the live data reason this suggestion exists
    icon: string;
  };

  // ── Mock data ────────────────────────────────────────────────
  const BRIEFING: Msg = {
    id: 'briefing',
    role: 'agent',
    content: `Good morning, John. Here's what needs your attention today.`,
    cards: [
      { type: 'work-order', data: { count: 3, label: 'Urgent work orders', detail: 'Engine, brakes, transmission', color: 'red' } },
      { type: 'parts-alert', data: { count: 2, label: 'Parts critically low', detail: 'Brake pads · Oil filters', color: 'amber' } },
      { type: 'technician', data: { name: 'Marcus', load: 7, total: 14, label: 'Heaviest load today' } },
      { type: 'appointment', data: { count: 6, label: "Today's appointments", detail: 'First at 8:30 AM', color: 'blue' } },
    ],
  };

  const THREAD: Msg[] = [
    BRIEFING,
    { id: '2', role: 'user', content: 'Who are the 2 urgent work orders for?' },
    {
      id: '3',
      role: 'agent',
      content: 'Here are the three urgent jobs:',
      cards: [
        {
          type: 'work-order',
          data: {
            id: 'WO-4821',
            vehicle: 'BMW 5-Series · 2021',
            issue: 'Engine misfire — P0300 fault code',
            tech: 'Marcus',
            eta: 'Today',
            priority: 'urgent',
          },
        },
        {
          type: 'work-order',
          data: {
            id: 'WO-4819',
            vehicle: 'Ford F-150 · 2019',
            issue: 'Brake system replacement',
            tech: 'Unassigned',
            eta: 'Today',
            priority: 'urgent',
          },
        },
        {
          type: 'work-order',
          data: {
            id: 'WO-4815',
            vehicle: 'Chevy Silverado · 2020',
            issue: 'Transmission rebuild',
            tech: 'Unassigned',
            eta: 'Tomorrow',
            priority: 'urgent',
          },
        },
      ],
    },
    { id: '4', role: 'user', content: 'Assign the F-150 and Silverado to Marcus' },
    {
      id: '5',
      role: 'agent',
      thinking: true,
      toolName: 'update_work_order',
    },
  ];

  const SUGGESTIONS: Suggestion[] = [
    { icon: '📩', text: 'Draft follow-ups for 2 overdue customers', signal: 'Last contact 18 days ago' },
    { icon: '📦', text: 'Reorder brake pads — 3 units left', signal: 'Below reorder point' },
    { icon: '📅', text: "Confirm tomorrow's 7 appointments", signal: '3 unconfirmed' },
  ];

  // ── State ────────────────────────────────────────────────────
  let messages = $state<Msg[]>(THREAD);
  let input = $state('');
  let el = $state<HTMLElement | null>(null);
  let sidebarOpen = $state(true);

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
</script>

<div class="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">

  <!-- ── Nav ───────────────────────────────────────────────────── -->
  <header class="relative z-10 flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/95 px-5 backdrop-blur-sm">
    <div class="flex items-center gap-2.5">
      <div class="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
        <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      </div>
      <span class="text-sm font-semibold tracking-tight">SmartSilo</span>
    </div>

    <button class="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.07]">
      <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" style="box-shadow: 0 0 6px rgb(52 211 153 / 0.8);"></span>
      Riverside Auto
      <svg class="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div class="flex items-center gap-2">
      <button
        onclick={() => { sidebarOpen = !sidebarOpen; }}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      </button>
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow">JK</div>
    </div>
  </header>

  <!-- ── Body ──────────────────────────────────────────────────── -->
  <div class="flex min-h-0 flex-1 overflow-hidden">

    <!-- ── Thread ────────────────────────────────────────────────── -->
    <main class="flex min-w-0 flex-1 flex-col">

      <div
        bind:this={el}
        class="flex-1 overflow-y-auto"
        style="background: radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%);"
      >
        <div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">

          {#each messages as msg (msg.id)}

            {#if msg.role === 'user'}
              <!-- ── User bubble ── -->
              <div class="flex justify-end">
                <p class="max-w-[72%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-indigo-950/60">
                  {msg.content}
                </p>
              </div>

            {:else}
              <!-- ── Agent turn ── -->
              <div class="flex items-start gap-3">

                <!-- Avatar -->
                <div class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow shadow-indigo-500/20">
                  <svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>

                <div class="flex min-w-0 max-w-[85%] flex-col gap-3">

                  {#if msg.thinking}
                    <!-- Thinking state -->
                    <div class="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm text-zinc-500">
                      <span>{msg.toolName ?? 'Thinking'}…</span>
                      <span class="flex items-end gap-0.5 pb-px">
                        <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-500" style="animation-delay:0ms"></span>
                        <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-500" style="animation-delay:150ms"></span>
                        <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-500" style="animation-delay:300ms"></span>
                      </span>
                    </div>

                  {:else}
                    <!-- Text -->
                    {#if msg.content}
                      <p class="rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-zinc-200">
                        {msg.content}
                      </p>
                    {/if}

                    <!-- Inline cards -->
                    {#if msg.cards}
                      <div class="flex flex-wrap gap-2">
                        {#each msg.cards as card}

                          {#if card.type === 'work-order' && card.data.count !== undefined}
                            <!-- Summary stat card -->
                            <div class="flex flex-1 min-w-47.5 items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                              <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-lg">🔧</span>
                              <div class="min-w-0 flex-1">
                                <p class="text-sm font-semibold text-red-400">{String(card.data.count)} {String(card.data.label)}</p>
                                <p class="text-xs text-zinc-500">{String(card.data.detail)}</p>
                              </div>
                              <button onclick={() => usePrompt('Show me the urgent work orders')} class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">View →</button>
                            </div>

                          {:else if card.type === 'parts-alert'}
                            <div class="flex flex-1 min-w-47.5 items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                              <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-lg">📦</span>
                              <div class="min-w-0 flex-1">
                                <p class="text-sm font-semibold text-amber-400">{String(card.data.count)} {String(card.data.label)}</p>
                                <p class="text-xs text-zinc-500">{String(card.data.detail)}</p>
                              </div>
                              <button onclick={() => usePrompt('Show parts running low on stock')} class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">View →</button>
                            </div>

                          {:else if card.type === 'technician'}
                            <div class="flex flex-1 min-w-47.5 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/3 px-4 py-3">
                              <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-lg">👷</span>
                              <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-zinc-300">{String(card.data.name)} — {String(card.data.label)}</p>
                                <div class="mt-1.5 flex items-center gap-2">
                                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                      class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                      style="width: {Math.round((Number(card.data.load) / Number(card.data.total)) * 100)}%"
                                    ></div>
                                  </div>
                                  <span class="flex-shrink-0 text-xs text-zinc-500">{String(card.data.load)}/{String(card.data.total)} jobs</span>
                                </div>
                              </div>
                            </div>

                          {:else if card.type === 'appointment'}
                            <div class="flex flex-1 min-w-47.5 items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                              <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-lg">📅</span>
                              <div class="min-w-0 flex-1">
                                <p class="text-sm font-semibold text-blue-400">{String(card.data.count)} {String(card.data.label)}</p>
                                <p class="text-xs text-zinc-500">{String(card.data.detail)}</p>
                              </div>
                              <button onclick={() => usePrompt("List today's appointments")} class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">View →</button>
                            </div>

                          {:else if card.type === 'work-order' && card.data.id !== undefined}
                            <!-- Individual work order card -->
                            <div class="w-full rounded-xl border border-white/[0.07] bg-white/3 px-4 py-3">
                              <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0 flex-1">
                                  <div class="flex items-center gap-2">
                                    <span class="rounded-md bg-red-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-red-400">Urgent</span>
                                    <span class="text-xs font-mono text-zinc-500">{String(card.data.id)}</span>
                                  </div>
                                  <p class="mt-1.5 text-sm font-medium text-zinc-200">{String(card.data.vehicle)}</p>
                                  <p class="mt-0.5 text-xs text-zinc-500">{String(card.data.issue)}</p>
                                </div>
                                <div class="flex-shrink-0 text-right">
                                  <p class="text-xs text-zinc-500">ETA</p>
                                  <p class="text-xs font-medium text-zinc-300">{String(card.data.eta)}</p>
                                </div>
                              </div>
                              <div class="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5">
                                <div class="flex items-center gap-1.5">
                                  <span class="h-4 w-4 rounded-full bg-zinc-700 text-[9px] font-bold flex items-center justify-center text-zinc-400">
                                    {String(card.data.tech) === 'Unassigned' ? '?' : String(card.data.tech)[0]}
                                  </span>
                                  <span class="text-xs text-zinc-500">{String(card.data.tech)}</span>
                                </div>
                                <button
                                  onclick={() => usePrompt(`Assign ${String(card.data.id)} to`)}
                                  class="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                  {String(card.data.tech) === 'Unassigned' ? 'Assign →' : 'Reassign →'}
                                </button>
                              </div>
                            </div>
                          {/if}

                        {/each}
                      </div>
                    {/if}
                  {/if}

                </div>
              </div>
            {/if}

          {/each}

        </div>
      </div>

      <!-- ── Suggestions ────────────────────────────────────────── -->
      <div class="flex-shrink-0 border-t border-white/[0.05] px-4 py-2.5">
        <div class="mx-auto flex max-w-2xl items-center gap-2 overflow-x-auto pb-0.5">
          {#each SUGGESTIONS as s}
            <button
              onclick={() => usePrompt(s.text)}
              class="group flex flex-shrink-0 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-left transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
            >
              <span class="text-xs">{s.icon}</span>
              <span class="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{s.text}</span>
              <span class="text-[10px] text-zinc-600">· {s.signal}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- ── Input ──────────────────────────────────────────────── -->
      <div class="relative flex-shrink-0 bg-zinc-950 px-4 pb-5 pt-2">
        <div class="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-zinc-950 to-transparent"></div>
        <div class="mx-auto max-w-2xl">
          <div class="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-xl shadow-black/40 transition-all duration-150 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20">
            <textarea
              bind:value={input}
              onkeydown={handleKeydown}
              placeholder="Ask anything or give an instruction…"
              rows={1}
              class="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              style="max-height: 140px; field-sizing: content;"
            ></textarea>
            <div class="flex items-center justify-between px-3 pb-3 pt-1">
              <div class="flex items-center gap-1.5">
                <span class="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-zinc-600">Garage</span>
                <span class="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-zinc-600">Gmail</span>
              </div>
              <button
                onclick={send}
                disabled={!input.trim()}
                class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-900/50 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-20"
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

    <!-- ── Right panel ────────────────────────────────────────────── -->
    {#if sidebarOpen}
      <aside class="flex w-64 flex-shrink-0 flex-col border-l border-white/[0.06] bg-zinc-900/30">

        <!-- Today at a glance -->
        <div class="border-b border-white/[0.06] px-4 py-3.5">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Today</p>
        </div>

        <div class="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          <!-- Stat pills -->
          {#each [
            { label: 'Open jobs', value: '14', sub: '3 urgent', color: 'text-red-400' },
            { label: 'Appointments', value: '6', sub: '3 unconfirmed', color: 'text-blue-400' },
            { label: 'Parts alerts', value: '2', sub: 'Below reorder', color: 'text-amber-400' },
            { label: 'Revenue today', value: '$2,840', sub: '↑ 12% vs yesterday', color: 'text-emerald-400' },
          ] as stat}
            <button
              onclick={() => usePrompt(`Tell me about ${stat.label.toLowerCase()}`)}
              class="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
            >
              <div>
                <p class="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.label}</p>
                <p class="text-xs text-zinc-600">{stat.sub}</p>
              </div>
              <span class="text-lg font-semibold {stat.color}">{stat.value}</span>
            </button>
          {/each}

          <!-- Divider -->
          <div class="my-2 border-t border-white/[0.05]"></div>

          <!-- Technician load -->
          <p class="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Team</p>
          {#each [
            { name: 'Marcus T.', jobs: 7, max: 10 },
            { name: 'Dana R.', jobs: 4, max: 10 },
            { name: 'Eli P.', jobs: 3, max: 10 },
          ] as tech}
            <button
              onclick={() => usePrompt(`Show work orders assigned to ${tech.name}`)}
              class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
            >
              <div class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                {tech.name[0]}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{tech.name}</p>
                <div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style="width: {(tech.jobs / tech.max) * 100}%"
                  ></div>
                </div>
              </div>
              <span class="flex-shrink-0 text-xs tabular-nums text-zinc-600">{tech.jobs}</span>
            </button>
          {/each}
        </div>

        <!-- Bottom: connect apps -->
        <div class="border-t border-white/[0.06] p-3">
          <button class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 py-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-indigo-500/40 hover:text-indigo-400">
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
