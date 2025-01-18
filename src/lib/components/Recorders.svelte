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

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
</script>

<div>
    <h2 class="text-2xl font-bold mb-4">Recorders</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {#each data.recorders as recorder}
            <div class="recorder-card border rounded-lg p-4 bg-white shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-bold">Recorder {recorder.rec_num}</h3>
                    <span class="status-badge {getStateClass(recorder.rec_state_type)}">
                        {recorder.rec_state_type}
                    </span>
                </div>
                <div class="space-y-1 text-sm">
                    <p><span class="font-medium">Type:</span> {recorder.type}</p>
                    <p><span class="font-medium">Frequency:</span> {formatFrequency(recorder.freq)}</p>
                    <p><span class="font-medium">Duration:</span> {formatDuration(recorder.duration)}</p>
                    <p><span class="font-medium">Calls:</span> {recorder.count}</p>
                    <p><span class="font-medium">Source:</span> {recorder.src_num}</p>
                    <p><span class="font-medium">Squelched:</span> {recorder.squelched ? 'Yes' : 'No'}</p>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .status-badge {
        @apply px-2 py-1 rounded text-xs font-medium;
    }
    
    .recording {
        @apply bg-green-100 text-green-800;
    }
    
    .idle {
        @apply bg-yellow-100 text-yellow-800;
    }
    
    .available {
        @apply bg-blue-100 text-blue-800;
    }
    
    .unknown {
        @apply bg-gray-100 text-gray-800;
    }
</style>
