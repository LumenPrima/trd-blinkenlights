<script>
    /** @type {{ data: any }} */
    let { data } = $props();

    function formatFrequency(freq) {
        return (freq / 1000000).toFixed(4) + ' MHz';
    }

    function getStateClass(state) {
        switch (state) {
            case 'RECORDING': return 'recording';
            case 'IDLE': return 'idle';
            case 'AVAILABLE': return 'available';
            default: return 'unknown';
        }
    }

    function formatTimeSince(timestamp) {
        if (!timestamp || isNaN(timestamp)) {
            return '--:--';
        }
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
</script>

<div>
    <h2 class="text-2xl font-bold mb-4">Recorders</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {#each data.recorders.sort((a, b) => a.rec_num - b.rec_num) as recorder}
            <div class="recorder-card p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Recorder {recorder.rec_num}</h3>
                    <span class="status-badge {getStateClass(recorder.rec_state_type)} flex flex-col items-center gap-0.5">
                        <span>{recorder.rec_state_type}</span>
                        {#if recorder.last_state_change}
                            <span class="text-xs">{formatTimeSince(recorder.last_state_change)}</span>
                        {/if}
                    </span>
                </div>
                <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p><span class="font-medium">Type:</span> {recorder.type}</p>
                    <p><span class="font-medium">Frequency:</span> {formatFrequency(recorder.freq)}</p>
                    <p><span class="font-medium">Duration:</span> {formatDuration(recorder.duration)}</p>
                    <p><span class="font-medium">Calls:</span> {recorder.count}</p>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .status-badge {
        @apply px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        min-width: 6rem;
        text-align: center;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        transition: all 0.2s ease-in-out;
    }
    
    .recording {
        @apply bg-green-500/10 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-500/20 dark:border-green-800/50;
    }
    
    .idle {
        @apply bg-yellow-500/10 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 dark:border-yellow-800/50;
    }
    
    .available {
        @apply bg-blue-500/10 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-500/20 dark:border-blue-800/50;
    }
    
    .unknown {
        @apply bg-gray-500/10 dark:bg-gray-800/20 text-gray-700 dark:text-gray-400 border border-gray-500/20 dark:border-gray-700/50;
    }
</style>
