<script lang="ts">
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import {
    getInvitation,
    acceptInvitation,
    declineInvitation,
  } from "./data.remote";

  const invitation = getInvitation();

  let form = $state({ name: "", password: "" });

  let submitting = $state(false);
  let declining = $state(false);

  async function handleAccept() {
    submitting = true;
    try {
      await acceptInvitation(form);

      goto("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      submitting = false;
    }
  }

  async function handleDecline() {
    declining = true;
    try {
      await declineInvitation({});
      toast.info("Invitation declined");
      goto("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      declining = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
  <div
    class="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm"
  >
    <svelte:boundary>
      {@const inv = await invitation}

      <div class="mb-6 space-y-1">
        <h1 class="text-xl font-semibold text-gray-900">You're invited</h1>
        <p class="text-sm text-gray-500">
          Join <span class="font-medium text-gray-800"
            >{inv.organizationName}</span
          >
          as
          <span class="font-medium text-gray-800"
            >{inv.role?.toLowerCase()}</span
          >
        </p>
        <p class="text-xs text-gray-400">
          Invitation for {inv.email} · expires {new Date(
            inv.expiresAt,
          ).toLocaleDateString()}
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <label for="name" class="mb-1 block text-sm font-medium text-gray-700"
            >Username</label
          >
          <input
            id="name"
            type="text"
            bind:value={form.name}
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </div>
        <div>
          <label
            for="password"
            class="mb-1 block text-sm font-medium text-gray-700"
            >Choose a password</label
          >
          <input
            id="password"
            type="password"
            bind:value={form.password}
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            disabled={submitting}
            onclick={handleAccept}
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
      </div>

      {#snippet pending()}
        <div class="space-y-3 animate-pulse">
          <div class="h-5 w-40 rounded bg-gray-100"></div>
          <div class="h-4 w-64 rounded bg-gray-100"></div>
        </div>
      {/snippet}

      {#snippet failed()}
        <p class="text-sm text-gray-500">
          This invitation is invalid or has expired.
        </p>
      {/snippet}
    </svelte:boundary>
  </div>
</div>
