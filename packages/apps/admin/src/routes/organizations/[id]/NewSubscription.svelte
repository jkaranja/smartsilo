<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer";
  import { upsertSubscription } from "./data.remote";
  import { Plus } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let open = $state(false);
  let submitting = $state(false);

  let plan = $state<"STARTER" | "PRO" | "ENTERPRISE">("STARTER");
  let status = $state<
    "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED"
  >("TRIALING");

  function resetForm() {
    plan = "STARTER";
    status = "TRIALING";
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    try {
      await upsertSubscription({ plan, status });
      open = false;
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      submitting = false;
    }
  }
</script>

<Drawer.Root bind:open direction="right">
  <Drawer.Trigger>
    <Button size="sm">
      <Plus class="h-4 w-4 mr-1" />
      Set subscription
    </Button>
  </Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Subscription</Drawer.Title>
        <Drawer.Description
          >Set the plan and status for this organization.</Drawer.Description
        >
      </Drawer.Header>

      <form onsubmit={handleSubmit} class="p-4 space-y-4">
        <div class="space-y-1">
          <label for="sub-plan" class="text-sm font-medium">Plan</label>
          <select
            id="sub-plan"
            required
            bind:value={plan}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>

        <div class="space-y-1">
          <label for="sub-status" class="text-sm font-medium">Status</label>
          <select
            id="sub-status"
            required
            bind:value={status}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="TRIALING">Trialing</option>
            <option value="ACTIVE">Active</option>
            <option value="PAST_DUE">Past due</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>

        <Drawer.Footer>
          <Button type="submit" disabled={submitting} class="w-full">
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Drawer.Close>
            <Button variant="outline" class="w-full">Cancel</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </form>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
