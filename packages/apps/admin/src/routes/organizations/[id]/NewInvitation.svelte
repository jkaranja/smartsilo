<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer";
  import { inviteMember } from "./data.remote";
  import { Plus } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let open = $state(false);
  let submitting = $state(false);

  let name = $state("");
  let email = $state("");
  let role = $state<"OWNER" | "ADMIN" | "MANAGER" | "MEMBER">("MEMBER");

  function resetForm() {
    name = "";
    email = "";
    role = "MEMBER";
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    try {
      await inviteMember({ name, email, role });
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
      Invite member
    </Button>
  </Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Invite member</Drawer.Title>
        <Drawer.Description
          >Send an invitation to join this organization.</Drawer.Description
        >
      </Drawer.Header>

      <form onsubmit={handleSubmit} class="p-4 space-y-4">
        <div class="space-y-1">
          <label for="inv-name" class="text-sm font-medium">Name</label>
          <input
            id="inv-name"
            required
            bind:value={name}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="space-y-1">
          <label for="inv-email" class="text-sm font-medium">Email</label>
          <input
            id="inv-email"
            type="email"
            required
            bind:value={email}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="space-y-1">
          <label for="inv-role" class="text-sm font-medium">Role</label>
          <select
            id="inv-role"
            required
            bind:value={role}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>

        <Drawer.Footer>
          <Button type="submit" disabled={submitting} class="w-full">
            {submitting ? "Sending…" : "Send invite"}
          </Button>
          <Drawer.Close>
            <Button variant="outline" class="w-full">Cancel</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </form>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
