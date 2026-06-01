<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer";
  import { toast } from "svelte-sonner";
  import { createOrganization } from "./data.remote";
  import { Plus } from "@lucide/svelte";

  let open = $state(false);
  let submitting = $state(false);
  let error = $state("");

  let name = $state("");
  let domain = $state("");
  let industry = $state<"GARAGE" | "CLINIC" | "DEALERSHIP">("GARAGE");

  function resetForm() {
    name = "";
    domain = "";
    industry = "GARAGE";
    error = "";
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    error = "";
    try {
      await createOrganization({ name, domain, industry });
      open = false;
      resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : "Something went wrong";
      toast.error(error);
    } finally {
      submitting = false;
    }
  }
</script>

<Drawer.Root bind:open direction="right">
  <Drawer.Trigger>
    <Button size="sm">
      <Plus class="h-4 w-4 mr-1" />
      New organization
    </Button>
  </Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>New organization</Drawer.Title>
        <Drawer.Description
          >Fill in the details to provision a new organization.</Drawer.Description
        >
      </Drawer.Header>

      <form onsubmit={handleSubmit} class="p-4 space-y-4">
        <div class="space-y-1">
          <label for="name" class="text-sm font-medium">Name</label>
          <input
            id="name"
            required
            bind:value={name}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="space-y-1">
          <label for="domain" class="text-sm font-medium">Domain</label>
          <input
            id="domain"
            required
            placeholder="acme.smartsilo.com"
            bind:value={domain}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div class="space-y-1">
          <label for="industry" class="text-sm font-medium">Industry</label>
          <select
            id="industry"
            required
            bind:value={industry}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="GARAGE">Garage</option>
            <option value="CLINIC">Clinic</option>
            <option value="DEALERSHIP">Dealership</option>
          </select>
        </div>

        <Drawer.Footer>
          <Button type="submit" disabled={submitting} class="w-full">
            {submitting ? "Creating…" : "Create"}
          </Button>
          <Drawer.Close>
            <Button variant="outline" class="w-full">Cancel</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </form>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
