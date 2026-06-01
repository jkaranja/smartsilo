<script lang="ts">
  import { page } from '$app/state'
  import { authClient } from '$lib/client/auth'

  type Tab = 'people' | 'sso' | 'invitations'

  let activeTab = $state<Tab>('people')

  // SSO form state
  let ssoIssuer       = $state('')
  let ssoDomain       = $state('')
  let ssoClientId     = $state('')
  let ssoClientSecret = $state('')
  let ssoLoading      = $state(false)
  let ssoError        = $state('')
  let ssoSuccess      = $state('')

  async function saveSso(e: SubmitEvent) {
    e.preventDefault()
    ssoError = ''
    ssoSuccess = ''
    ssoLoading = true

    const res = await fetch('/api/settings/sso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issuer: ssoIssuer,
        domain: ssoDomain,
        clientId: ssoClientId,
        clientSecret: ssoClientSecret,
      }),
      credentials: 'include',
    })

    ssoLoading = false

    if (!res.ok) {
      const data = await res.json()
      ssoError = data.error ?? 'Failed to save SSO configuration'
      return
    }

    ssoSuccess = 'SSO provider saved successfully'
  }

  async function removeSso() {
    ssoError = ''
    ssoSuccess = ''

    const res = await fetch('/api/settings/sso', {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!res.ok) {
      ssoError = 'Failed to remove SSO provider'
      return
    }

    ssoSuccess = 'SSO provider removed'
    ssoIssuer = ssoDomain = ssoClientId = ssoClientSecret = ''
  }
</script>

<div class="min-h-screen bg-white dark:bg-gray-950 px-6 py-8 max-w-3xl mx-auto">

  <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
    Organization settings
  </h1>

  <!-- Tabs -->
  <div class="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-8">
    {#each (['people', 'sso', 'invitations'] as Tab[]) as tab}
      <button
        onclick={() => activeTab = tab}
        class="px-4 py-2 text-sm font-medium capitalize transition-colors
          {activeTab === tab
            ? 'border-b-2 border-violet-600 text-violet-600'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
      >
        {tab}
      </button>
    {/each}
  </div>

  <!-- People tab -->
  {#if activeTab === 'people'}
    <p class="text-sm text-gray-500">Member management coming soon.</p>
  {/if}

  <!-- SSO tab -->
  {#if activeTab === 'sso'}
    <div class="space-y-6">
      <div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Single Sign-On (OIDC)
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Connect your identity provider so members can sign in with their company account.
          Supports any OIDC-compliant provider (Google Workspace, Okta, Azure AD, etc.)
        </p>
      </div>

      <form onsubmit={saveSso} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Issuer URL
          </label>
          <input
            type="url"
            bind:value={ssoIssuer}
            required
            placeholder="https://accounts.google.com"
            class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email domain
          </label>
          <input
            type="text"
            bind:value={ssoDomain}
            required
            placeholder="acme.com"
            class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"
          />
          <p class="mt-1 text-xs text-gray-400">Users with this email domain will be routed to your IdP.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Client ID
          </label>
          <input
            type="text"
            bind:value={ssoClientId}
            required
            class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Client secret
          </label>
          <input
            type="password"
            bind:value={ssoClientSecret}
            required
            class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"
          />
        </div>

        {#if ssoError}
          <p class="text-sm text-red-500">{ssoError}</p>
        {/if}

        {#if ssoSuccess}
          <p class="text-sm text-green-600">{ssoSuccess}</p>
        {/if}

        <div class="flex gap-3">
          <button
            type="submit"
            disabled={ssoLoading}
            class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {ssoLoading ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onclick={removeSso}
            class="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Remove
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Invitations tab -->
  {#if activeTab === 'invitations'}
    <p class="text-sm text-gray-500">Invitation management coming soon.</p>
  {/if}

</div>
