<script lang="ts">
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/client/auth";

  let { user }: { user?: { name: string; email: string } | null } = $props();

  async function signOut() {
    await authClient.signOut();
    goto("/login");
  }
</script>

{#if user}
  <header class="border-b bg-white px-8 py-6 flex items-center justify-between">
    <a href="/" class="text-sm font-semibold">Smartsilo</a>

    <div class="text-sm text-gray-500">
      <span class="mr-4">{user.name || user.email}</span>
      <button onclick={signOut} class="hover:text-gray-900">Sign out</button>
    </div>
  </header>
{/if}
