<script lang="ts">
  import { getDashboardStats } from "./data.remote";
  import * as Card from "$lib/components/ui/card";
  import { Building2, ArrowRight } from "@lucide/svelte";
  import { goto } from "$app/navigation";

  const stats = getDashboardStats();
</script>

<div class="p-8 max-w-5xl mx-auto space-y-6">
  <h1 class="text-xl font-semibold">Dashboard</h1>

  <div class="grid grid-cols-3 gap-4">
    <Card.Root
      class="hover:bg-muted/50 transition-colors cursor-pointer"
      onclick={() => goto("/organizations")}
    >
      <Card.Header class="flex flex-row items-center justify-between">
        <Card.Title class="font-medium ">Organizations</Card.Title>
        <Building2 class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        {#await stats}
          <p class="text-2xl font-bold animate-pulse">—</p>
        {:then { orgCount }}
          <p class="text-2xl font-bold">{orgCount}</p>
        {/await}
      </Card.Content>
      <Card.Footer class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">Manage</span>
        <ArrowRight class="h-4 w-4 text-muted-foreground" />
      </Card.Footer>
    </Card.Root>
  </div>
</div>
