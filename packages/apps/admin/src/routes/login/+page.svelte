<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <p class="text-sm text-gray-500 mt-1">Sign in to your account</p>
    </div>

    <form
      method="POST"
      class="space-y-4"
      use:enhance={() => {
        loading = true;
        return ({ update }) => {
          loading = false;
          update();
        };
      }}
    >
      {#if form?.error}
        <p class="text-sm text-red-600 text-center">{form.error}</p>
      {/if}

      <div class="space-y-2">
        <label for="email" class="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <Button type="submit" class="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  </div>
</div>
