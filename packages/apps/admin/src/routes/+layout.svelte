<script lang="ts">
  import "./app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { Toaster } from "$lib/components/ui/sonner";
  import Header from "$lib/components/header.svelte";
  import type { LayoutProps } from "./$types";

  let { children, data }: LayoutProps = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toaster position="top-right"  />

<Header user={data.user} />

{@render children()}
