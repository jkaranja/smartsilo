import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: true,
    experimental: {
      async: true,
    },
  },
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    },
  },
};

export default config;
