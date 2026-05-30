<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let inviting   = $state(false);
  let addingMcp  = $state(false);
  let mcpAuthVisible = $state(false);
</script>

<div class="p-8 max-w-4xl mx-auto space-y-10">

  <!-- Header -->
  <div>
    <a href="/orginizations" class="text-sm text-gray-500 hover:underline">← Organisations</a>
    <h1 class="text-xl font-semibold mt-2">{data.org.name}</h1>
    <p class="text-sm text-gray-500">{data.org.domain} · {data.org.industry} · {data.org.plan ?? '—'}</p>
  </div>

  <!-- MCP Servers -->
  <section class="space-y-4">
    <h2 class="font-medium">MCP Servers</h2>

    {#if (form as any)?.mcpError}
      <p class="text-sm text-red-600">{(form as any).mcpError}</p>
    {/if}

    <!-- Server list -->
    {#if data.mcpServers.length > 0}
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="pb-2 font-medium">Name</th>
            <th class="pb-2 font-medium">URL</th>
            <th class="pb-2 font-medium">Type</th>
            <th class="pb-2 font-medium">Status</th>
            <th class="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.mcpServers as server}
            <tr class="border-b hover:bg-gray-50">
              <td class="py-3 font-medium">{server.name}</td>
              <td class="py-3 text-gray-500 font-mono text-xs">{server.serverUrl}</td>
              <td class="py-3">
                <span class="rounded-full px-2 py-0.5 text-xs {server.type === 'INTERNAL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
                  {server.type}
                </span>
              </td>
              <td class="py-3">
                <span class="rounded-full px-2 py-0.5 text-xs {server.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                  {server.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="py-3">
                <div class="flex gap-2 justify-end">
                  <form method="POST" action="?/toggleMcp" use:enhance>
                    <input type="hidden" name="id" value={server.id} />
                    <input type="hidden" name="isActive" value={String(server.isActive)} />
                    <button type="submit" class="text-xs text-gray-500 hover:text-gray-800 underline">
                      {server.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                  {#if server.type === 'EXTERNAL'}
                    <form method="POST" action="?/deleteMcp" use:enhance>
                      <input type="hidden" name="id" value={server.id} />
                      <button type="submit" class="text-xs text-red-500 hover:text-red-700 underline">Remove</button>
                    </form>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="text-sm text-gray-500">No MCP servers yet.</p>
    {/if}

    <!-- Add external server form -->
    <form
      method="POST"
      action="?/addMcp"
      class="border rounded-lg p-5 space-y-4 bg-white"
      use:enhance={() => {
        addingMcp = true;
        return ({ update }) => { addingMcp = false; update(); };
      }}
    >
      <h3 class="text-sm font-medium text-gray-700">Add external MCP server</h3>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <label for="mcpName" class="text-sm font-medium">Name</label>
          <input id="mcpName" name="mcpName" required placeholder="e.g. Stripe MCP"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="space-y-1">
          <label for="mcpServerUrl" class="text-sm font-medium">Server URL</label>
          <input id="mcpServerUrl" name="mcpServerUrl" required placeholder="https://mcp.example.com/mcp"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <label for="mcpAuthToken" class="text-sm font-medium">Auth token</label>
          <span class="text-xs text-gray-400">(optional)</span>
          <button type="button" onclick={() => mcpAuthVisible = !mcpAuthVisible}
            class="text-xs text-gray-400 hover:text-gray-600 underline ml-auto">
            {mcpAuthVisible ? 'Hide' : 'Show'}
          </button>
        </div>
        <input id="mcpAuthToken" name="mcpAuthToken"
          type={mcpAuthVisible ? 'text' : 'password'}
          placeholder="Bearer token or API key"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
      </div>

      <Button type="submit" disabled={addingMcp}>
        {addingMcp ? 'Adding…' : 'Add server'}
      </Button>
    </form>
  </section>

  <!-- Invite form -->
  <section>
    <form
      method="POST"
      action="?/invite"
      class="border rounded-lg p-6 space-y-4 bg-white"
      use:enhance={() => {
        inviting = true;
        return ({ update }) => { inviting = false; update(); };
      }}
    >
      <h2 class="font-medium">Invite member</h2>

      {#if (form as any)?.inviteError}
        <p class="text-sm text-red-600">{(form as any).inviteError}</p>
      {/if}

      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1">
          <label for="name" class="text-sm font-medium">Name</label>
          <input id="name" name="name" required class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="space-y-1">
          <label for="email" class="text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" required class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="space-y-1">
          <label for="role" class="text-sm font-medium">Role</label>
          <select id="role" name="role" required class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>
      </div>

      <Button type="submit" disabled={inviting}>
        {inviting ? 'Sending…' : 'Send invite'}
      </Button>
    </form>
  </section>

  <!-- Invitations list -->
  <section class="space-y-3">
    <h2 class="font-medium">Invitations</h2>

    {#if data.invitations.length === 0}
      <p class="text-sm text-gray-500">No invitations yet.</p>
    {:else}
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="pb-2 font-medium">Name</th>
            <th class="pb-2 font-medium">Email</th>
            <th class="pb-2 font-medium">Role</th>
            <th class="pb-2 font-medium">Expires</th>
            <th class="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each data.invitations as inv}
            <tr class="border-b hover:bg-gray-50">
              <td class="py-3">{inv.name}</td>
              <td class="py-3 text-gray-500">{inv.email}</td>
              <td class="py-3">{inv.role}</td>
              <td class="py-3 text-gray-500">{new Date(inv.expiresAt).toLocaleDateString()}</td>
              <td class="py-3">
                {#if inv.acceptedAt}
                  <span class="rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-700">Accepted</span>
                {:else if new Date(inv.expiresAt) < new Date()}
                  <span class="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-500">Expired</span>
                {:else}
                  <span class="rounded-full px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700">Pending</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

</div>
