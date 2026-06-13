<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/client/auth";
  import { isMcpOAuthFlow } from "$lib/oauth";

  let credentials = $state({ email: "", password: "" });
  let ssoEmail = $state("");
  let error = $state("");
  let loading = $state(false);
  let googleLoading = $state(false);
  let ssoLoading = $state(false);
  let showSso = $state(false);

  // Better Auth passes OAuth params directly to the login page (not wrapped in oauth_query).
  const rawOauthQuery = isMcpOAuthFlow(page.url.searchParams)
    ? page.url.search.slice(1)
    : null;

  const callbackURL = rawOauthQuery ? `/consent?${rawOauthQuery}` : "/agent";

  const signInWithGoogle = async () => {
    googleLoading = true;
    await authClient.signIn.social({ provider: "google", callbackURL });
    googleLoading = false;
  };

  const signInWithSso = async () => {
    error = "";
    ssoLoading = true;
    const { error: err } = await authClient.signIn.sso({
      email: ssoEmail,
      callbackURL,
    });
    ssoLoading = false;
    if (err) {
      error = err.message ?? "No SSO provider found for this email domain";
    }
  };

  const signInWithCredentials = async () => {
    error = "";
    loading = true;
    const { error: err } = await authClient.signIn.email({
      email: credentials.email,
      password: credentials.password,
      callbackURL,
    });
    loading = false;
    if (err) {
      error = err.message ?? "Invalid email or password";
      return;
    }
    goto(callbackURL);
  };
</script>

<div
  class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950"
>
  <div
    class="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900"
  >
    <h1 class="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
      Sign in
    </h1>

    <!-- Google -->
    <button
      onclick={signInWithGoogle}
      disabled={googleLoading}
      class="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {googleLoading ? "Redirecting…" : "Google"}
    </button>

    <!-- SSO -->
    {#if !showSso}
      <button
        onclick={() => (showSso = true)}
        class="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <svg
          class="h-4 w-4 shrink-0 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        Continue with SSO
      </button>
    {:else}
      <form onsubmit={signInWithSso} class="mb-3 space-y-2">
        <input
          type="email"
          bind:value={ssoEmail}
          required
          placeholder="Work email"
          class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-colors outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <div class="flex gap-2">
          <button
            type="submit"
            disabled={ssoLoading}
            class="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {ssoLoading ? "Checking…" : "Continue"}
          </button>
          <button
            type="button"
            onclick={() => {
              showSso = false;
              error = "";
            }}
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    {/if}

    <div class="my-5 flex items-center gap-3">
      <div class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
      <span class="text-xs text-gray-400">or</span>
      <div class="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
    </div>

    <!-- Email / password -->
    <div class="space-y-4">
      <div>
        <label
          for="email"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          bind:value={credentials.email}
          autocomplete="email"
          class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-colors outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label
          for="password"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={credentials.password}
          autocomplete="current-password"
          class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-colors outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}

      <button
        onclick={signInWithCredentials}
        disabled={loading}
        class="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </div>
  </div>
</div>
