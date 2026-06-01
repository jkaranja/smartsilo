<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	if (browser) {
		const subdomain = window.location.hostname.split('.')[0];
		const isLocalhost = subdomain === 'localhost' || subdomain === '127';
		const slug = isLocalhost ? (import.meta.env.VITE_DEFAULT_TENANT ?? 'demo') : subdomain;
		goto(`/${slug}`, { replaceState: true });
	}
</script>
