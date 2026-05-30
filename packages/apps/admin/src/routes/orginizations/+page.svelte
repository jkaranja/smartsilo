<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let creating  = $state(false);
  let domain    = $state('');
  let mcpUrl    = $state('');
  let mcpEdited = $state(false);

  $effect(() => {
    if (!mcpEdited) {
      mcpUrl = domain ? `https://mcp.${domain}/mcp` : '';
    }
  });

  function onMcpInput(e: Event) {
    mcpEdited = true;
    mcpUrl = (e.target as HTMLInputElement).value;
  }
</script>

<div class="p-8 max-w-5xl mx-auto space-y-8">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold">Organisations</h1>
  </div>

  <!-- Create form -->
  <form
    method="POST"
    action="?/create"
    class="border rounded-lg p-6 space-y-4 bg-white"
    use:enhance={() => {
      creating = true;
      return ({ update }) => { creating = false; update(); };
    }}
  >
    <h2 class="font-medium">New organisation</h2>

    {#if form?.error}
      <p class="text-sm text-red-600">{form.error}</p>
    {/if}

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-1">
        <label for="name" class="text-sm font-medium">Name</label>
        <input id="name" name="name" required
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="space-y-1">
        <label for="domain" class="text-sm font-medium">Domain</label>
        <input id="domain" name="domain" required placeholder="acme.smartsilo.com"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
          bind:value={domain} />
      </div>
      <div class="space-y-1">
        <label for="industry" class="text-sm font-medium">Industry</label>
        <select id="industry" name="industry" required class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="GARAGE">Garage</option>
          <option value="CLINIC">Clinic</option>
          <option value="DEALERSHIP">Dealership</option>
        </select>
      </div>
      <div class="space-y-1">
        <label for="plan" class="text-sm font-medium">Plan</label>
        <select id="plan" name="plan" class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>
      <div class="space-y-1 col-span-2">
        <label for="mcpServerUrl" class="text-sm font-medium">MCP server URL</label>
        <input id="mcpServerUrl" name="mcpServerUrl" required
          value={mcpUrl}
          oninput={onMcpInput}
          placeholder="https://mcp.acme.smartsilo.com/mcp"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
        <p class="text-xs text-gray-400">Auto-derived from domain — edit to override</p>
      </div>
    </div>

    <Button type="submit" disabled={creating}>
      {creating ? 'Creating…' : 'Create'}
    </Button>
  </form>

  <!-- Org list -->
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b text-left text-gray-500">
        <th class="pb-2 font-medium">Name</th>
        <th class="pb-2 font-medium">Domain</th>
        <th class="pb-2 font-medium">Industry</th>
        <th class="pb-2 font-medium">Plan</th>
        <th class="pb-2 font-medium">Members</th>
        <th class="pb-2 font-medium">Subscription</th>
      </tr>
    </thead>
    <tbody>
      {#each data.orgs as org}
        <tr class="border-b hover:bg-gray-50">
          <td class="py-3">
            <a href={`/orginizations/${org.id}`} class="font-medium hover:underline">{org.name}</a>
          </td>
          <td class="py-3 text-gray-500 font-mono text-xs">{org.domain}</td>
          <td class="py-3">{org.industry}</td>
          <td class="py-3">{org.plan ?? '—'}</td>
          <td class="py-3">{org.memberCount}</td>
          <td class="py-3">
            {#if org.status}
              {@const colours: Record<string, string> = {
                TRIALING: 'bg-yellow-100 text-yellow-700',
                ACTIVE:   'bg-green-100 text-green-700',
                PAST_DUE: 'bg-orange-100 text-orange-700',
                CANCELLED:'bg-gray-100 text-gray-500',
                PAUSED:   'bg-gray-100 text-gray-500',
              }}
              <span class="rounded-full px-2 py-0.5 text-xs {colours[org.status] ?? 'bg-gray-100 text-gray-500'}">
                {org.status.replace('_', ' ')}
              </span>
            {:else}
              <span class="text-gray-400">—</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
