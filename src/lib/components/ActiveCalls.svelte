<script>
    /** @type {{ data: any }} */
    let { data } = $props();

    function formatFrequency(freq) {
        return (freq / 1000000).toFixed(4) + ' MHz';
    }

    function getCallStateClass(call) {
        if (call.finished) return 'finished';
        if (call.emergency) return 'emergency';
        if (call.encrypted) return 'encrypted';
        if (call.call_state_type === 'RECORDING') return 'recording';
        return 'monitoring';
    }

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const activeCalls = $derived(
        Array.from(data.calls.values()).filter(call => !call.finished)
    );

    const finishedCalls = $derived(
        Array.from(data.calls.values())
            .filter(call => call.finished)
            .sort((a, b) => b.finishedAt - a.finishedAt)
    );
</script>

<div>
    <h2 class="text-2xl font-bold mb-4">Active Calls</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each activeCalls as call}
            <div class="call-card border rounded-lg p-4 bg-white shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-bold">
                        {call.talkgroup_alpha_tag || `Talkgroup ${call.talkgroup}`}
                    </h3>
                    <span class="status-badge {getCallStateClass(call)}">
                        {call.call_state_type}
                    </span>
                </div>
                <div class="space-y-1 text-sm">
                    <p><span class="font-medium">System:</span> {call.sys_name}</p>
                    <p><span class="font-medium">Frequency:</span> {formatFrequency(call.freq)}</p>
                    {#if call.talkgroup_description}
                        <p><span class="font-medium">Description:</span> {call.talkgroup_description}</p>
                    {/if}
                    {#if call.talkgroup_group}
                        <p><span class="font-medium">Group:</span> {call.talkgroup_group}</p>
                    {/if}
                    <p><span class="font-medium">Started:</span> {new Date(call.start_time * 1000).toLocaleTimeString()}</p>
                    <p><span class="font-medium">Duration:</span> {formatDuration(call.elapsed)}</p>
                    {#if call.unit}
                        <p><span class="font-medium">Unit:</span> {call.unit}</p>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    {#if finishedCalls.length > 0}
        <h3 class="text-xl font-bold mt-8 mb-4">Recent Calls</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {#each finishedCalls as call}
                <div class="call-card border rounded-lg p-4 bg-gray-50 shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-lg font-bold">
                            {call.talkgroup_alpha_tag || `Talkgroup ${call.talkgroup}`}
                        </h3>
                        <span class="status-badge finished">Finished</span>
                    </div>
                    <div class="space-y-1 text-sm">
                        <p><span class="font-medium">System:</span> {call.sys_name}</p>
                        <p><span class="font-medium">Frequency:</span> {formatFrequency(call.freq)}</p>
                        {#if call.talkgroup_description}
                            <p><span class="font-medium">Description:</span> {call.talkgroup_description}</p>
                        {/if}
                        <p><span class="font-medium">Started:</span> {new Date(call.start_time * 1000).toLocaleTimeString()}</p>
                        <p><span class="font-medium">Duration:</span> {formatDuration(call.elapsed)}</p>
                        <p><span class="font-medium">Ended:</span> {new Date(call.finishedAt).toLocaleTimeString()}</p>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .status-badge {
        @apply px-2 py-1 rounded text-xs font-medium;
    }
    
    .emergency {
        @apply bg-red-100 text-red-800;
    }
    
    .encrypted {
        @apply bg-purple-100 text-purple-800;
    }
    
    .recording {
        @apply bg-green-100 text-green-800;
    }
    
    .monitoring {
        @apply bg-blue-100 text-blue-800;
    }

    .finished {
        @apply bg-gray-100 text-gray-800;
    }
</style>
