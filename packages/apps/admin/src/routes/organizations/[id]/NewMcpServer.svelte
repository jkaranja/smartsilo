<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer";
  import { addMcpServer } from "./data.remote";
  import { Plus } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let open = $state(false);
  let submitting = $state(false);

  let name = $state("");
  let url = $state("");

  function resetForm() {
    name = "";
    url = "";
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    try {
      await addMcpServer({ name, url });
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
      Add MCP server
    </Button>
  </Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Add MCP server</Drawer.Title>
        <Drawer.Description
          >Register the organization's internal MCP server. Tools are fetched
          and cached on save.</Drawer.Description
        >
      </Drawer.Header>

      <form onsubmit={handleSubmit} class="p-4 space-y-4">
        <div class="space-y-1">
          <label for="mcp-name" class="text-sm font-medium">Name</label>
          <input
            id="mcp-name"
            required
            bind:value={name}
            placeholder="e.g. Stripe MCP"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="space-y-1">
          <label for="mcp-url" class="text-sm font-medium">Server URL</label>
          <input
            id="mcp-url"
            required
            bind:value={url}
            placeholder="https://mcp.example.com/mcp"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </div>

        <Drawer.Footer>
          <Button type="submit" disabled={submitting} class="w-full">
            {submitting ? "Adding…" : "Add server"}
          </Button>
          <Drawer.Close>
            <Button variant="outline" class="w-full">Cancel</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </form>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
