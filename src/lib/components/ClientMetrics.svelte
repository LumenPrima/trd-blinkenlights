<script>
    import { onMount } from 'svelte';

    let metrics = {};

    async function fetchMetrics() {
        const res = await fetch('/api/metrics');
        metrics = await res.json();
    }
    
    // Refresh every 5 seconds
    let interval;
    onMount(() => {
        interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    });
</script>

<div class="metrics-panel p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
    <h2 class="text-lg font-bold mb-4">Client Metrics</h2>
    
    <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="metric-card">
            <div class="metric-value">{metrics.totalClients}</div>
            <div class="metric-label">Connected Clients</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{metrics.totalMessages}</div>
            <div class="metric-label">Total Messages</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{(metrics.totalBytes / 1024).toFixed(2)} KB</div>
            <div class="metric-label">Data Sent</div>
        </div>
    </div>

    <div class="client-list space-y-2">
        {#each Object.entries(metrics.clients || {}) as [id, client]}
            <div class="client-item p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-medium">{client.ip}</div>
                        <div class="text-xs text-gray-500">{client.userAgent}</div>
                    </div>
                    <div class="text-right">
                        <div>{client.messageCount} messages</div>
                        <div class="text-sm">{(client.bytesSent / 1024).toFixed(2)} KB</div>
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .metric-card {
        @apply p-4 bg-gray-50 dark:bg-gray-700 rounded text-center;
    }
    .metric-value {
        @apply text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1;
    }
    .metric-label {
        @apply text-sm text-gray-600 dark:text-gray-400;
    }
</style>
