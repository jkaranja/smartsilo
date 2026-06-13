<script lang="ts">
  import "./app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { Toaster } from "$lib/components/ui/sonner";
  import type { LayoutProps } from "./$types";
  import Header from "$lib/components/Header.svelte";

  let { children, data }: LayoutProps = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toaster position="top-right" />

{@render children()}
