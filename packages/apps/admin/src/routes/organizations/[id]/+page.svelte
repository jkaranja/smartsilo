<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs";
  import type { PageProps } from "./$types";
  import {
    getMcpServers,
    getSubscription,
    getInvitations,
    toggleMcpServer,
    deleteMcpServer,
    deleteInvitation,
    deleteSubscription,
  } from "./data.remote";
  import { Trash2, Copy } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import NewMcpServer from "./NewMcpServer.svelte";
  import NewSubscription from "./NewSubscription.svelte";
  import NewInvitation from "./NewInvitation.svelte";

  let { data }: PageProps = $props();

  const mcpServers = getMcpServers();
  const subscription = getSubscription();
  const invitations = getInvitations();
</script>

<div class="p-8 max-w-4xl mx-auto space-y-6">
  <div>
    <a
      href="/organizations"
      class="text-sm text-muted-foreground hover:underline">← Organizations</a
    >
    <h1 class="text-xl font-semibold mt-2">{data.org.name}</h1>
    <p class="text-sm text-muted-foreground">
      {data.org.domain} · {data.org.industry}
    </p>
  </div>

  <Tabs.Root value="mcp">
    <Tabs.List>
      <Tabs.Trigger value="mcp">MCP Servers</Tabs.Trigger>
      <Tabs.Trigger value="subscription">Subscription</Tabs.Trigger>
      <Tabs.Trigger value="invitations">Invitations</Tabs.Trigger>
      <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="mcp" class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          External MCP servers connected to this organization.
        </p>
        <NewMcpServer />
      </div>

      {#await mcpServers then servers}
        {#if servers.length === 0}
          <p class="text-sm text-muted-foreground">No MCP servers yet.</p>
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="pb-2 font-medium">Name</th>
                <th class="pb-2 font-medium">URL</th>
                <th class="pb-2 font-medium">Type</th>
                <th class="pb-2 font-medium">Status</th>
                <th class="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {#each servers as server (server.id)}
                <tr class="border-b hover:bg-muted/50">
                  <td class="py-3 font-medium">{server.name}</td>
                  <td class="py-3 text-muted-foreground font-mono text-xs"
                    >{server.url}</td
                  >
                  <td class="py-3">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs {server.type ===
                      'INTERNAL'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'}"
                    >
                      {server.type}
                    </span>
                  </td>
                  <td class="py-3">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs {server.connected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'}"
                    >
                      {server.connected ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td class="py-3">
                    <div class="flex gap-2 items-center justify-end">
                      <button
                        onclick={() =>
                          toggleMcpServer({
                            id: server.id,
                            connected: !server.connected,
                          })}
                        class="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        {server.connected ? "Disable" : "Enable"}
                      </button>
                      {#if server.type === "EXTERNAL"}
                        <button
                          onclick={() => deleteMcpServer({ id: server.id })}
                          class="text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 class="h-4 w-4" />
                        </button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/await}
    </Tabs.Content>

    <Tabs.Content value="subscription" class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Plan and billing status for this organization.
        </p>
        <NewSubscription />
      </div>

      {#await subscription then sub}
        {#if !sub}
          <p class="text-sm text-muted-foreground">No subscription yet.</p>
        {:else}
          {@const statusColors: Record<string, string> = {
            TRIALING: 'bg-yellow-100 text-yellow-700',
            ACTIVE: 'bg-green-100 text-green-700',
            PAST_DUE: 'bg-orange-100 text-orange-700',
            CANCELLED: 'bg-gray-100 text-gray-500',
            PAUSED: 'bg-gray-100 text-gray-500',
          }}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="pb-2 font-medium">Plan</th>
                <th class="pb-2 font-medium">Status</th>
                <th class="pb-2 font-medium">Updated</th>
                <th class="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-muted/50">
                <td class="py-3 font-medium">{sub.plan}</td>
                <td class="py-3">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs {statusColors[
                      sub.status ?? ''
                    ] ?? 'bg-gray-100 text-gray-500'}"
                  >
                    {sub.status?.replace("_", " ") ?? "—"}
                  </span>
                </td>
                <td class="py-3 text-muted-foreground"
                  >{new Date(sub.updatedAt).toLocaleDateString()}</td
                >
                <td class="py-3 text-right">
                  <button
                    onclick={() => deleteSubscription({ id: sub.id })}
                    class="text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        {/if}
      {/await}
    </Tabs.Content>

    <Tabs.Content value="invitations" class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Pending and accepted invitations.
        </p>
        <NewInvitation />
      </div>

      {#await invitations then invs}
        {#if invs.length === 0}
          <p class="text-sm text-muted-foreground">No invitations yet.</p>
        {:else}
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="pb-2 font-medium">Name</th>
                <th class="pb-2 font-medium">Email</th>
                <th class="pb-2 font-medium">Role</th>
                <th class="pb-2 font-medium">Expires</th>
                <th class="pb-2 font-medium">Status</th>
                <th class="pb-2 font-medium">Invite URL</th>
                <th class="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {#each invs as inv (inv.id)}
                {@const inviteUrl = new URL(
                  `/invitations/${inv.id}`,
                  `https://${data.org.domain}`,
                ).href}

                <tr class="border-b hover:bg-muted/50">
                  <td class="py-3">{inv.name}</td>
                  <td class="py-3 text-muted-foreground">{inv.email}</td>
                  <td class="py-3">{inv.role}</td>
                  <td class="py-3 text-muted-foreground"
                    >{new Date(inv.expiresAt).toLocaleDateString()}</td
                  >
                  <td class="py-3">
                    {#if inv.acceptedAt}
                      <span
                        class="rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-700"
                        >Accepted</span
                      >
                    {:else if new Date(inv.expiresAt) < new Date()}
                      <span
                        class="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-500"
                        >Expired</span
                      >
                    {:else}
                      <span
                        class="rounded-full px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700"
                        >Pending</span
                      >
                    {/if}
                  </td>
                  <td class="py-3">
                    <button
                      onclick={() =>
                        navigator.clipboard
                          .writeText(inviteUrl)
                          .then(() => toast.success("Copied!"))}
                      class="flex items-center max-w-xs overflow-auto gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono"
                    >
                      <Copy class="h-3 w-3 shrink-0" />
                      {inviteUrl}
                    </button>
                  </td>
                  <td class="py-3 text-right">
                    <button
                      onclick={() => deleteInvitation({ id: inv.id })}
                      class="text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/await}
    </Tabs.Content>

    <Tabs.Content value="settings" class="pt-4">
      <p class="text-sm text-muted-foreground">Settings coming soon.</p>
    </Tabs.Content>
  </Tabs.Root>
</div>
