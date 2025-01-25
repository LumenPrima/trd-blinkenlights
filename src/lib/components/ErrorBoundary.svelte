<script>
    let error = null;
    
    function handleError(event) {
        error = event.error;
    }
</script>

<svelte:window on:error={handleError} />

{#if error}
    <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h2 class="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Something went wrong</h2>
        <pre class="text-sm text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-auto">{error.message}</pre>
    </div>
{:else}
    <slot />
{/if}
