<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Drawer from "$lib/components/ui/drawer";
  import { addMcpServer } from "./data.remote";
  import { Plus } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let open = $state(false);
  let submitting = $state(false);

  let name = $state("");
  let serverUrl = $state("");
  let authToken = $state("");
  let authVisible = $state(false);

  function resetForm() {
    name = "";
    serverUrl = "";
    authToken = "";
    authVisible = false;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    try {
      await addMcpServer({
        name,
        serverUrl,
        authToken: authToken || undefined,
      });
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
          >Connect an external MCP server to this organization.</Drawer.Description
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
            bind:value={serverUrl}
            placeholder="https://mcp.example.com/mcp"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label for="mcp-token" class="text-sm font-medium">
              Auth token <span class="text-xs text-gray-400 font-normal"
                >(optional)</span
              >
            </label>
            <button
              type="button"
              onclick={() => (authVisible = !authVisible)}
              class="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {authVisible ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="mcp-token"
            bind:value={authToken}
            type={authVisible ? "text" : "password"}
            placeholder="Bearer token or API key"
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
