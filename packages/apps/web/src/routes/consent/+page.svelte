<script lang="ts">
  import { page } from '$app/state'
  import { authClient } from '$lib/client/auth'

  let loading = $state(false)
  let error   = $state('')

  const oauthQuery = page.url.searchParams.get('oauth_query') ?? ''

  // Parse client_id and scopes for display from oauth_query
  const params = (() => {
    try {
      return Object.fromEntries(new URLSearchParams(oauthQuery))
    } catch {
      return {} as Record<string, string>
    }
  })()

  const clientId = params['client_id'] ?? 'Unknown app'
  const scopes   = (params['scope'] ?? 'read').split(' ').filter(Boolean)

  async function respond(accept: boolean) {
    if (!oauthQuery) {
      error = 'Missing authorization context'
      return
    }

    loading = true
    error = ''

    const { data, error: err } = await authClient.$fetch('/oauth2/consent', {
      method: 'POST',
      body: { accept, oauth_query: oauthQuery },
    })

    loading = false

    if (err || !data) {
      error = (err as any)?.message ?? 'Something went wrong'
      return
    }

    const redirectURI = (data as any).redirectURI
    if (redirectURI) {
      window.location.href = redirectURI
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950 px-4">
  <div class="w-full max-w-sm">

    <div class="mb-6 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
        <svg class="h-6 w-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Authorize access</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        <span class="font-medium text-gray-900 dark:text-gray-100">{clientId}</span>
        is requesting access to your account
      </p>
    </div>

    <div class="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Requested permissions
      </p>
      <ul class="space-y-1">
        {#each scopes as scope}
          <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <svg class="h-4 w-4 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {scope}
          </li>
        {/each}
      </ul>
    </div>

    {#if error}
      <p class="mb-4 text-sm text-red-500">{error}</p>
    {/if}

    <div class="flex gap-3">
      <button
        onclick={() => respond(false)}
        disabled={loading}
        class="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 transition-colors"
      >
        Deny
      </button>
      <button
        onclick={() => respond(true)}
        disabled={loading}
        class="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Authorizing…' : 'Allow'}
      </button>
    </div>

  </div>
</div>
