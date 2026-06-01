<script lang="ts">
  import { getOrganizations, deleteOrganization } from "./data.remote";
  import NewOrganization from "./NewOrganization.svelte";
  import { Trash2 } from "@lucide/svelte";
</script>

<div class="p-8 max-w-5xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold">Organizations</h1>
  </div>

  <!-- Org list -->
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">All organizations</p>
      <NewOrganization />
    </div>

    <table class="w-full text-sm">
      <thead>
        <tr class="border-b text-left text-gray-500">
          <th class="pb-2 font-medium">Name</th>
          <th class="pb-2 font-medium">Domain</th>
          <th class="pb-2 font-medium">Industry</th>
          <th class="pb-2 font-medium">Plan</th>
          <th class="pb-2 font-medium">Members</th>
          <th class="pb-2 font-medium">Invitations</th>
          <th class="pb-2 font-medium">MCP</th>
          <th class="pb-2 font-medium">Subscription</th>
          <th class="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {#await getOrganizations()}
          <tr
            ><td colspan="9" class="py-4 text-sm text-muted-foreground"
              >Loading…</td
            ></tr
          >
        {:then orgs}
          {#each orgs as org (org.id)}
            <tr class="border-b hover:bg-gray-50">
              <td class="py-3">
                <a
                  href={`/organizations/${org.id}`}
                  class="font-medium hover:underline">{org.name}</a
                >
              </td>
              <td class="py-3 text-gray-500 font-mono text-xs">{org.domain}</td>
              <td class="py-3">{org.industry}</td>
              <td class="py-3">{org.plan ?? "—"}</td>
              <td class="py-3">{org.memberCount}</td>
              <td class="py-3">{org.invitationCount ?? "—"}</td>
              <td class="py-3 font-mono text-xs text-muted-foreground"
                >{org.mcpUrl ?? "—"}</td
              >
              <td class="py-3">
                {#if org.status}
                  {@const statusColors: Record<string, string> = {
                    TRIALING: 'bg-yellow-100 text-yellow-700',
                    ACTIVE:   'bg-green-100 text-green-700',
                    PAST_DUE: 'bg-orange-100 text-orange-700',
                    CANCELLED:'bg-gray-100 text-gray-500',
                    PAUSED:   'bg-gray-100 text-gray-500',
                  }}
                  <span
                    class="rounded-full px-2 py-0.5 text-xs {statusColors[
                      org.status
                    ] ?? 'bg-gray-100 text-gray-500'}"
                  >
                    {org.status.replace("_", " ")}
                  </span>
                {:else}
                  <span class="text-gray-400">—</span>
                {/if}
              </td>
              <td class="py-3 text-right">
                <button
                  onclick={() => deleteOrganization({ id: org.id })}
                  class="text-muted-foreground cursor-pointer hover:text-red-600 transition-colors"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          {/each}
        {/await}
      </tbody>
    </table>
  </div>
</div>
