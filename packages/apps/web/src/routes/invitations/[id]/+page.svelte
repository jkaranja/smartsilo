<script lang="ts">
  import { goto } from "$app/navigation";
  import { getInvitation, acceptInvitation, declineInvitation } from "./data.remote";

  const invitation = getInvitation();

  let name = $state("");
  let password = $state("");
  let submitting = $state(false);
  let declining = $state(false);
  let error = $state("");

  async function handleAccept(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    error = "";
    try {
      const result = await acceptInvitation({ name, password });
      if (result?.redirectTo) goto(result.redirectTo);
    } catch (err) {
      error = err instanceof Error ? err.message : "Something went wrong";
    } finally {
      submitting = false;
    }
  }

  async function handleDecline() {
    declining = true;
    try {
      await declineInvitation({});
      goto("/");
    } catch (err) {
      error = err instanceof Error ? err.message : "Something went wrong";
      declining = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
    {#await invitation}
      <div class="space-y-3 animate-pulse">
        <div class="h-5 w-40 rounded bg-gray-100"></div>
        <div class="h-4 w-64 rounded bg-gray-100"></div>
      </div>
    {:then inv}
      {#if !inv}
        <p class="text-sm text-gray-500">This invitation is invalid or has expired.</p>
      {:else}
        <div class="mb-6 space-y-1">
          <h1 class="text-xl font-semibold text-gray-900">You're invited</h1>
          <p class="text-sm text-gray-500">
            Join <span class="font-medium text-gray-800">{inv.organizationName}</span>
            as <span class="font-medium text-gray-800">{inv.role.toLowerCase()}</span>
          </p>
          <p class="text-xs text-gray-400">
            Invitation for {inv.email} · expires {new Date(inv.expiresAt).toLocaleDateString()}
          </p>
        </div>

        {#if error}
          <p class="mb-4 text-sm text-red-500">{error}</p>
        {/if}

        <form onsubmit={handleAccept} class="space-y-4">
          <div>
            <label for="name" class="mb-1 block text-sm font-medium text-gray-700">Your name</label>
            <input
              id="name"
              type="text"
              required
              bind:value={name}
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-gray-700">Choose a password</label>
            <input
              id="password"
              type="password"
              required
              minlength="8"
              bind:value={password}
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              class="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? "Joining…" : "Accept & join"}
            </button>
            <button
              type="button"
              disabled={declining}
              onclick={handleDecline}
              class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              {declining ? "…" : "Decline"}
            </button>
          </div>
        </form>
      {/if}
    {:catch}
      <p class="text-sm text-gray-500">This invitation is invalid or has expired.</p>
    {/await}
  </div>
</div>
