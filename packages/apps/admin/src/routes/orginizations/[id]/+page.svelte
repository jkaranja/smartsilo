<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let inviting = $state(false);
</script>

<div class="p-8 max-w-4xl mx-auto space-y-8">
  <div>
    <a href="/orgs" class="text-sm text-gray-500 hover:underline">← Organisations</a>
    <h1 class="text-xl font-semibold mt-2">{data.org.name}</h1>
    <p class="text-sm text-gray-500">{data.org.namespace} · {data.org.industry} · {data.org.plan}</p>
  </div>

  <!-- Invite form -->
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

    {#if form?.error}
      <p class="text-sm text-red-600">{form.error}</p>
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

  <!-- Invitations list -->
  <div class="space-y-3">
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
  </div>
</div>
