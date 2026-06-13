<script lang="ts">
  import { onMount } from "svelte";
  import { ws } from "$lib/websocket.svelte";
  import { getThreads } from "./data.remote";
  import { authClient } from "$lib/client/auth";
  import { goto } from "$app/navigation";

  // ── Types ────────────────────────────────────────────────────
  type CardType = "stat" | "work-order-detail" | "technician-bar";

  type InlineCard = {
    type: CardType;
    data: Record<string, unknown>;
  };

  type Msg = {
    id: string;
    role: "user" | "agent" | "divider";
    content?: string;
    cards?: InlineCard[];
    thinking?: boolean;
    toolName?: string;
    dividerLabel?: string;
  };

  type Suggestion = {
    text: string;
    signal: string;
    icon: string;
  };

  type NavItem = {
    id: string;
    label: string;
    icon: string;
    lastAt?: string | Date;
  };

  type Thread = {
    context: string;
    updatedAt: Date | string;
    lastBriefedAt: Date | string | null;
  };

  // ── Helpers ──────────────────────────────────────────────────
  type Color = "red" | "amber" | "blue" | "green" | "neutral";

  async function signOut() {
    await authClient.signOut();
    goto("/sign-in");
  }

  function s(
    icon: string,
    label: string,
    value: string | number,
    sub: string,
    color: Color = "neutral",
  ): InlineCard {
    return {
      type: "stat",
      data: {
        icon,
        label,
        value,
        sub,
        color,
        prompt: `Show me ${String(value)} ${label.toLowerCase()}`,
      },
    };
  }

  function tech(name: string, load: number, total: number): InlineCard {
    return {
      type: "technician-bar",
      data: { name, load, total, prompt: `Show ${name}'s current work orders` },
    };
  }

  function wo(
    id: string,
    vehicle: string,
    issue: string,
    techName: string,
    eta: string,
  ): InlineCard {
    return {
      type: "work-order-detail",
      data: { id, vehicle, issue, tech: techName, eta },
    };
  }

  // ── Color map (full strings keep Tailwind from purging) ──────
  const C: Record<
    Color,
    { border: string; bg: string; iconBg: string; text: string }
  > = {
    red: {
      border: "border-red-500/20",
      bg: "bg-red-500/5",
      iconBg: "bg-red-500/15",
      text: "text-red-400",
    },
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      iconBg: "bg-amber-500/15",
      text: "text-amber-400",
    },
    blue: {
      border: "border-blue-500/20",
      bg: "bg-blue-500/5",
      iconBg: "bg-blue-500/15",
      text: "text-blue-400",
    },
    green: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      iconBg: "bg-emerald-500/15",
      text: "text-emerald-400",
    },
    neutral: {
      border: "border-white/[0.07]",
      bg: "bg-white/3",
      iconBg: "bg-white/[0.06]",
      text: "text-zinc-300",
    },
  };

  function c(color: unknown) {
    return C[(color as Color) in C ? (color as Color) : "neutral"];
  }

  // ── Divider helper ────────────────────────────────────────────
  function divider(label: string, id?: string): Msg {
    return {
      id: id ?? `divider-${label}`,
      role: "divider",
      dividerLabel: label,
    };
  }

  // ── General thread (returning next day — Yesterday + Today) ──
  const DEFAULT_THREAD: Msg[] = [
    divider("Yesterday"),
    {
      id: "yesterday-briefing",
      role: "agent",
      content: `Good morning, John. Here's what needed your attention yesterday.`,
      cards: [
        s(
          "🔧",
          "Urgent work orders",
          4,
          "Engine, brakes, suspension, electrical",
          "red",
        ),
        s(
          "📦",
          "Parts critically low",
          3,
          "Brake pads · Oil filters · Air filters",
          "amber",
        ),
        tech("Marcus T.", 6, 14),
        s("📅", "Yesterday's appointments", 5, "All completed", "blue"),
      ],
    },
    {
      id: "d2",
      role: "user",
      content: "Who are the 3 urgent work orders for?",
    },
    {
      id: "d3",
      role: "agent",
      content: "Here are the three urgent jobs:",
      cards: [
        wo(
          "WO-4821",
          "BMW 5-Series · 2021",
          "Engine misfire — P0300 fault code",
          "Marcus",
          "Today",
        ),
        wo(
          "WO-4819",
          "Ford F-150 · 2019",
          "Brake system replacement",
          "Unassigned",
          "Today",
        ),
        wo(
          "WO-4815",
          "Chevy Silverado · 2020",
          "Transmission rebuild",
          "Unassigned",
          "Tomorrow",
        ),
      ],
    },
    {
      id: "d4",
      role: "user",
      content: "Assign the F-150 and Silverado to Marcus",
    },
    { id: "d5", role: "agent", thinking: true, toolName: "update_work_order" },
    divider("Today"),
    {
      id: "today-briefing",
      role: "agent",
      content: `Good morning, John. Here's what needs your attention today.`,
      cards: [
        s("🔧", "Urgent work orders", 3, "Engine, brakes, transmission", "red"),
        s("📦", "Parts critically low", 2, "Brake pads · Oil filters", "amber"),
        tech("Marcus T.", 7, 14),
        s("📅", "Today's appointments", 6, "First at 8:30 AM", "blue"),
      ],
    },
  ];

  const DEFAULT_SUGGESTIONS: Suggestion[] = [
    {
      icon: "📩",
      text: "Draft follow-ups for 2 overdue customers",
      signal: "Last contact 18 days ago",
    },
    {
      icon: "📦",
      text: "Reorder brake pads — 3 units left",
      signal: "Below reorder point",
    },
    {
      icon: "📅",
      text: "Confirm tomorrow's 7 appointments",
      signal: "3 unconfirmed",
    },
  ];

  // ── Dynamic nav from WS + thread history ─────────────────────
  let threads = $state<Thread[]>([]);

  function relativeTime(iso: string | Date): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  const navTopics = $derived<NavItem[]>(
    ws.capabilities.map((t) => ({
      id: t.id,
      label: t.label,
      icon: t.icon,
      lastAt: threads.find((th) => th.context === t.id)?.updatedAt,
    })),
  );

  const navApps = $derived<NavItem[]>(
    ws.apps.map((a) => {
      const id = a.name.toLowerCase().replace(/\s+/g, "-");
      return {
        id,
        label: a.name,
        icon: "🔌",
        lastAt: threads.find((th) => th.context === id)?.updatedAt,
      };
    }),
  );

  // ── State ────────────────────────────────────────────────────
  let selectedNavId = $state<string | null>(null);
  let historyMsgs = $state<Msg[]>(DEFAULT_THREAD);
  let suggestions = $state<Suggestion[]>(DEFAULT_SUGGESTIONS);
  let input = $state("");
  let el = $state<HTMLElement | null>(null);
  let rightPanelOpen = $state(true);

  const selectedNav = $derived(
    [...navTopics, ...navApps].find((n) => n.id === selectedNavId) ?? null,
  );

  const messages = $derived<Msg[]>([
    ...historyMsgs,
    ...(ws.messages as unknown as Msg[]),
  ]);

  $effect(() => {
    // read length so $effect re-runs on every new message
    messages.length;

    setTimeout(
      () => el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" }),
      40,
    );
  });

  onMount(async () => {
    ws.connect();

    try {
      const data = await getThreads();

      if (data) threads = data;
    } catch {
      /* threads stays empty */
    }
  });

  function selectGeneral() {
    selectedNavId = null;
    historyMsgs = DEFAULT_THREAD;
    ws.clearMessages();
    suggestions = DEFAULT_SUGGESTIONS;
  }

  function selectNav(id: string) {
    const item = [...navTopics, ...navApps].find((n) => n.id === id);
    if (!item) return;
    selectedNavId = id;
    suggestions = [];
    ws.clearMessages();

    const thread = threads.find((t) => t.context === id);
    if (thread) {
      historyMsgs = [
        divider(relativeTime(thread.updatedAt), `${id}-div-prior`),
        divider("Now", `${id}-div-now`),
      ];
    } else {
      historyMsgs = [];
    }
    input = `Brief me on ${item.label}`;
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    ws.send(text, selectedNavId ?? "general");
    input = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function usePrompt(text: string) {
    input = text;
  }

  function sendDirect(text: string) {
    ws.send(text, selectedNavId ?? "general");
  }
</script>

<div class="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
  <!-- ── Header ────────────────────────────────────────────────── -->
  <header
    class="relative z-10 flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/95 backdrop-blur-sm"
  >
    <!-- Left: logo (lines up with left sidebar) -->
    <div
      class="flex h-full w-52 flex-shrink-0 items-center gap-2.5 border-r border-white/[0.06] px-4"
    >
      <div
        class="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25"
      >
        <svg
          class="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
          />
        </svg>
      </div>
      <span class="text-sm font-semibold tracking-tight">SmartSilo</span>
      <button
        onclick={selectGeneral}
        title="New conversation"
        class="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white/6 hover:text-zinc-300"
      >
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
          />
        </svg>
      </button>
    </div>

    <!-- Center: org pill -->
    <button
      class="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.07]"
    >
      <span
        class="h-1.5 w-1.5 rounded-full bg-emerald-400"
        style="box-shadow: 0 0 6px rgb(52 211 153 / 0.8);"
      ></span>
      Riverside Auto
      <svg
        class="h-3 w-3 text-zinc-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m19.5 8.25-7.5 7.5-7.5-7.5"
        />
      </svg>
    </button>

    <!-- Right: actions -->
    <div class="flex h-full items-center gap-2 px-4">
      <button
        onclick={() => {
          rightPanelOpen = !rightPanelOpen;
        }}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
          />
        </svg>
      </button>

      <button
        class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow"
        onclick={signOut}
      >
        JK
      </button>
    </div>
  </header>

  <!-- ── Body: 3 panels ────────────────────────────────────────── -->
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <!-- ── Left sidebar (nav) ─────────────────────────────────── -->
    <nav
      class="flex w-52 shrink-0 flex-col border-r border-white/6 bg-zinc-900/20"
    >
      <!-- General (pinned) -->
      <div class="px-2.5 pt-3 pb-1">
        <button
          onclick={selectGeneral}
          class="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors
            {selectedNavId === null
            ? 'text-indigo-300'
            : 'text-zinc-500 hover:bg-white/4 hover:text-zinc-300'}"
        >
          <span class="text-sm leading-none">💬</span>
          <span class="text-xs font-medium">General</span>
          {#if selectedNavId === null}
            <span class="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
          {:else}
            <span class="ml-auto text-[10px] text-zinc-700">2m ago</span>
          {/if}
        </button>
      </div>

      <div class="mx-3 border-t border-white/5"></div>

      <!-- Garage + Apps sections -->
      <div class="flex-1 overflow-y-auto px-2.5 py-3">
        <p
          class="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
        >
          Ask about
        </p>

        {#each navTopics as item}
          <button
            onclick={() => selectNav(item.id)}
            class="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors
              {selectedNavId === item.id
              ? 'text-indigo-300'
              : 'text-zinc-500 hover:bg-white/4 hover:text-zinc-300'}"
          >
            <span class="text-sm leading-none">{item.icon}</span>
            <span class="text-xs font-medium">{item.label}</span>
            {#if selectedNavId === item.id}
              <span class="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400"
              ></span>
            {:else if item.lastAt}
              <span class="ml-auto text-[10px] text-zinc-700"
                >{relativeTime(item.lastAt)}</span
              >
            {:else}
              <span
                class="ml-auto text-[10px] text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100"
                >brief me →</span
              >
            {/if}
          </button>
        {/each}

        <!-- Apps section -->
        <p
          class="mb-1.5 mt-5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
        >
          Connected apps
        </p>

        {#each navApps as item}
          <button
            onclick={() => selectNav(item.id)}
            class="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors
              {selectedNavId === item.id
              ? 'text-indigo-300'
              : 'text-zinc-500 hover:bg-white/4 hover:text-zinc-300'}"
          >
            <span class="text-sm leading-none">{item.icon}</span>
            <span class="text-xs font-medium">{item.label}</span>
            {#if selectedNavId === item.id}
              <span class="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400"
              ></span>
            {:else if item.lastAt}
              <span class="ml-auto text-[10px] text-zinc-700"
                >{relativeTime(item.lastAt)}</span
              >
            {:else}
              <span
                class="ml-auto text-[10px] text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100"
                >brief me →</span
              >
            {/if}
          </button>
        {/each}
      </div>

      <!-- Connect more apps -->
      <div class="border-t border-white/[0.06] p-3">
        <button
          class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 py-2.5 text-xs font-medium text-zinc-600 transition-colors hover:border-indigo-500/40 hover:text-indigo-400"
        >
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Connect more apps
        </button>
      </div>
    </nav>

    <!-- ── Center: chat ───────────────────────────────────────── -->
    <main class="flex min-w-0 flex-1 flex-col">
      <!-- Section label strip -->
      {#if selectedNav}
        <div
          class="flex flex-shrink-0 items-center gap-2 border-b border-white/[0.04] px-5 py-2.5"
        >
          <span class="text-sm">{selectedNav.icon}</span>
          <span class="text-xs font-medium text-zinc-400"
            >{selectedNav.label}</span
          >
          <button
            onclick={selectGeneral}
            class="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ✕ clear
          </button>
        </div>
      {/if}

      <!-- Thread -->
      <div
        bind:this={el}
        class="flex-1 overflow-y-auto"
        style="background: radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%);"
      >
        <div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
          {#each messages as msg (msg.id)}
            {#if msg.role === "divider"}
              <div class="flex items-center gap-3 py-1">
                <div class="h-px flex-1 bg-white/5"></div>
                <span
                  class="text-[10px] font-medium uppercase tracking-widest text-zinc-700"
                  >{msg.dividerLabel}</span
                >
                <div class="h-px flex-1 bg-white/5"></div>
              </div>
            {:else if msg.role === "user"}
              <div class="flex justify-end">
                <p
                  class="max-w-[72%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-indigo-950/60"
                >
                  {msg.content}
                </p>
              </div>
            {:else if msg.role === "agent"}
              <div class="flex items-start gap-3">
                <!-- Agent avatar -->
                <div
                  class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow shadow-indigo-500/20"
                >
                  <svg
                    class="h-3.5 w-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                    />
                  </svg>
                </div>

                <div class="flex min-w-0 max-w-[85%] flex-col gap-2.5">
                  {#if msg.thinking}
                    <div
                      class="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm text-zinc-500"
                    >
                      <span>{msg.toolName ?? "Thinking"}…</span>
                      <span class="flex items-end gap-0.5 pb-px">
                        <span
                          class="h-1 w-1 animate-bounce rounded-full bg-indigo-500"
                          style="animation-delay:0ms"
                        ></span>
                        <span
                          class="h-1 w-1 animate-bounce rounded-full bg-indigo-500"
                          style="animation-delay:150ms"
                        ></span>
                        <span
                          class="h-1 w-1 animate-bounce rounded-full bg-indigo-500"
                          style="animation-delay:300ms"
                        ></span>
                      </span>
                    </div>
                  {:else}
                    {#if msg.content}
                      <p
                        class="rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-zinc-200"
                      >
                        {msg.content}
                      </p>
                    {/if}

                    {#if msg.cards}
                      <div class="flex flex-wrap gap-2">
                        {#each msg.cards as card}
                          {#if card.type === "stat"}
                            {@const col = c(card.data.color)}
                            <button
                              onclick={() =>
                                sendDirect(String(card.data.prompt))}
                              class="flex flex-1 min-w-44 items-center gap-3 rounded-xl border {col.border} {col.bg} px-3.5 py-3 text-left transition-all hover:brightness-110 active:brightness-95"
                            >
                              <span
                                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg {col.iconBg} text-base"
                              >
                                {String(card.data.icon)}
                              </span>
                              <div class="min-w-0 flex-1">
                                <p
                                  class="text-sm font-semibold {col.text} leading-tight"
                                >
                                  {String(card.data.value)}
                                </p>
                                <p
                                  class="text-xs font-medium text-zinc-300 leading-tight"
                                >
                                  {String(card.data.label)}
                                </p>
                                <p class="mt-0.5 text-[11px] text-zinc-600">
                                  {String(card.data.sub)}
                                </p>
                              </div>
                            </button>
                          {:else if card.type === "technician-bar"}
                            <button
                              onclick={() =>
                                sendDirect(String(card.data.prompt))}
                              class="flex flex-1 min-w-44 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/3 px-3.5 py-3 text-left transition-all hover:border-white/15 hover:bg-white/5 active:brightness-95"
                            >
                              <div
                                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400"
                              >
                                {String(card.data.name)[0]}
                              </div>
                              <div class="min-w-0 flex-1">
                                <div class="flex items-center justify-between">
                                  <p class="text-xs font-medium text-zinc-300">
                                    {String(card.data.name)}
                                  </p>
                                  <span
                                    class="text-xs tabular-nums text-zinc-600"
                                    >{String(card.data.load)}/{String(
                                      card.data.total,
                                    )}</span
                                  >
                                </div>
                                <div
                                  class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
                                >
                                  <div
                                    class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                    style="width: {Math.round(
                                      (Number(card.data.load) /
                                        Number(card.data.total)) *
                                        100,
                                    )}%"
                                  ></div>
                                </div>
                              </div>
                            </button>
                          {:else if card.type === "work-order-detail"}
                            <div
                              class="w-full rounded-xl border border-white/[0.07] bg-white/3 px-4 py-3"
                            >
                              <div
                                class="flex items-start justify-between gap-3"
                              >
                                <div class="min-w-0 flex-1">
                                  <div class="flex items-center gap-2">
                                    <span
                                      class="rounded-md bg-red-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-red-400"
                                      >Urgent</span
                                    >
                                    <span
                                      class="font-mono text-xs text-zinc-500"
                                      >{String(card.data.id)}</span
                                    >
                                  </div>
                                  <p
                                    class="mt-1.5 text-sm font-medium text-zinc-200"
                                  >
                                    {String(card.data.vehicle)}
                                  </p>
                                  <p class="mt-0.5 text-xs text-zinc-500">
                                    {String(card.data.issue)}
                                  </p>
                                </div>
                                <div class="flex-shrink-0 text-right">
                                  <p class="text-[10px] text-zinc-600">ETA</p>
                                  <p class="text-xs font-medium text-zinc-300">
                                    {String(card.data.eta)}
                                  </p>
                                </div>
                              </div>
                              <div
                                class="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5"
                              >
                                <div class="flex items-center gap-1.5">
                                  <span
                                    class="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-400"
                                  >
                                    {String(card.data.tech) === "Unassigned"
                                      ? "?"
                                      : String(card.data.tech)[0]}
                                  </span>
                                  <span class="text-xs text-zinc-500"
                                    >{String(card.data.tech)}</span
                                  >
                                </div>
                                <button
                                  onclick={() =>
                                    usePrompt(
                                      `Assign ${String(card.data.id)} to`,
                                    )}
                                  class="text-[11px] text-indigo-400 transition-colors hover:text-indigo-300"
                                >
                                  {String(card.data.tech) === "Unassigned"
                                    ? "Assign →"
                                    : "Reassign →"}
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

      <!-- ── Suggestions bar ──────────────────────────────────── -->
      <div class="flex-shrink-0 border-t border-white/[0.05] px-4 py-2.5">
        <div
          class="mx-auto flex max-w-2xl items-center gap-2 overflow-x-auto pb-0.5"
        >
          {#each suggestions as sg}
            <button
              onclick={() => usePrompt(sg.text)}
              class="group flex flex-shrink-0 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
            >
              <span class="text-xs">{sg.icon}</span>
              <span
                class="text-xs text-zinc-400 transition-colors group-hover:text-zinc-200"
                >{sg.text}</span
              >
              <span class="text-[10px] text-zinc-600">· {sg.signal}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- ── Input ─────────────────────────────────────────────── -->
      <div class="relative flex-shrink-0 bg-zinc-950 px-4 pb-5 pt-2">
        <div
          class="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-zinc-950 to-transparent"
        ></div>
        <div class="mx-auto max-w-2xl">
          <div
            class="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-xl shadow-black/40 transition-all duration-150 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20"
          >
            <textarea
              bind:value={input}
              onkeydown={handleKeydown}
              placeholder={selectedNav
                ? `Ask about ${selectedNav.label.toLowerCase()}…`
                : "Ask anything or give an instruction…"}
              rows={1}
              class="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              style="max-height: 140px; field-sizing: content;"
            ></textarea>
            <div class="flex items-center justify-between px-3 pb-3 pt-1">
              <div class="flex items-center gap-1.5">
                {#if selectedNav}
                  <span
                    class="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400"
                  >
                    {selectedNav.icon}
                    {selectedNav.label}
                  </span>
                {:else}
                  <span
                    class="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                    >Garage</span
                  >
                  <span
                    class="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                    >Gmail</span
                  >
                {/if}
              </div>
              <button
                onclick={send}
                disabled={!input.trim()}
                aria-label="Send message"
                class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-900/50 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <svg
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                  />
                </svg>
              </button>
            </div>
          </div>
          <p class="mt-2 text-center text-[11px] text-zinc-700">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </main>

    <!-- ── Right panel (Today + Team) ────────────────────────── -->
    {#if rightPanelOpen}
      <aside
        class="flex w-64 flex-shrink-0 flex-col border-l border-white/[0.06] bg-zinc-900/30"
      >
        <div class="border-b border-white/[0.06] px-4 py-3.5">
          <p
            class="text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
          >
            Today
          </p>
        </div>

        <div class="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {#each [{ label: "Open jobs", value: "14", sub: "3 urgent", color: "text-red-400" }, { label: "Appointments", value: "6", sub: "3 unconfirmed", color: "text-blue-400" }, { label: "Parts alerts", value: "2", sub: "Below reorder", color: "text-amber-400" }, { label: "Revenue today", value: "$2,840", sub: "↑ 12% vs yesterday", color: "text-emerald-400" }] as stat}
            <button
              onclick={() =>
                usePrompt(`Tell me about ${stat.label.toLowerCase()}`)}
              class="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
            >
              <div>
                <p
                  class="text-xs text-zinc-500 transition-colors group-hover:text-zinc-400"
                >
                  {stat.label}
                </p>
                <p class="text-xs text-zinc-600">{stat.sub}</p>
              </div>
              <span class="text-lg font-semibold {stat.color}"
                >{stat.value}</span
              >
            </button>
          {/each}

          <div class="my-2 border-t border-white/[0.05]"></div>

          <p
            class="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-600"
          >
            Team
          </p>

          {#each [{ name: "Marcus T.", jobs: 7, max: 10 }, { name: "Dana R.", jobs: 4, max: 10 }, { name: "Eli P.", jobs: 3, max: 10 }] as t}
            <button
              onclick={() =>
                usePrompt(`Show work orders assigned to ${t.name}`)}
              class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
            >
              <div
                class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400"
              >
                {t.name[0]}
              </div>
              <div class="min-w-0 flex-1">
                <p
                  class="text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-200"
                >
                  {t.name}
                </p>
                <div
                  class="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-800"
                >
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style="width: {(t.jobs / t.max) * 100}%"
                  ></div>
                </div>
              </div>
              <span class="flex-shrink-0 tabular-nums text-xs text-zinc-600"
                >{t.jobs}</span
              >
            </button>
          {/each}
        </div>
      </aside>
    {/if}
  </div>
</div>
