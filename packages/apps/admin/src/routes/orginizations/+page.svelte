<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let creating = $state(false);
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
        <input id="name" name="name" required class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div class="space-y-1">
        <label for="namespace" class="text-sm font-medium">Namespace</label>
        <input id="namespace" name="namespace" required class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
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
        <th class="pb-2 font-medium">Namespace</th>
        <th class="pb-2 font-medium">Industry</th>
        <th class="pb-2 font-medium">Plan</th>
        <th class="pb-2 font-medium">Members</th>
        <th class="pb-2 font-medium">Status</th>
      </tr>
    </thead>
    <tbody>
      {#each data.orgs as org}
        <tr class="border-b hover:bg-gray-50">
          <td class="py-3">
            <a href="/orgs/{org.id}" class="font-medium hover:underline">{org.name}</a>
          </td>
          <td class="py-3 text-gray-500">{org.namespace}</td>
          <td class="py-3">{org.industry}</td>
          <td class="py-3">{org.plan}</td>
          <td class="py-3">{org.memberCount}</td>
          <td class="py-3">
            <span class="rounded-full px-2 py-0.5 text-xs {org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
              {org.status}
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
