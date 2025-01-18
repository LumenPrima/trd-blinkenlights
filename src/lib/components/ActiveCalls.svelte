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
    <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 overflow-x-auto">
        {#each activeCalls as call}
            <div class="call-card border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 shadow-sm min-w-0">
                <div class="flex justify-between items-start gap-2">
                    <h3 class="text-base font-semibold truncate">
                        {call.talkgroup_alpha_tag || `Talkgroup ${call.talkgroup}`}
                    </h3>
                    <span class="status-badge {getCallStateClass(call)} shrink-0">
                        {call.call_state_type}
                    </span>
                </div>
                <div class="grid grid-cols-[max-content,1fr] gap-x-2 gap-y-1 text-sm mt-1">
                    <span class="font-medium">System:</span><span class="truncate">{call.sys_name}</span>
                    <span class="font-medium">Freq:</span><span>{formatFrequency(call.freq)}</span>
                    {#if call.talkgroup_description}
                        <span class="font-medium">Desc:</span><span class="truncate">{call.talkgroup_description}</span>
                    {/if}
                    {#if call.talkgroup_group}
                        <span class="font-medium">Group:</span><span class="truncate">{call.talkgroup_group}</span>
                    {/if}
                    <span class="font-medium">Start:</span><span>{new Date(call.start_time * 1000).toLocaleTimeString()}</span>
                    <span class="font-medium">Dur:</span><span>{formatDuration(call.elapsed)}</span>
                    {#if call.unit}
                        <span class="font-medium">Unit:</span><span class="truncate">{call.unit}</span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    {#if finishedCalls.length > 0}
        <h3 class="text-xl font-bold mt-8 mb-4">Recent Calls</h3>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 overflow-x-auto opacity-75">
            {#each finishedCalls as call}
                <div class="call-card border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900 shadow-sm min-w-0">
                    <div class="flex justify-between items-start gap-2">
                        <h3 class="text-base font-semibold truncate">
                            {call.talkgroup_alpha_tag || `Talkgroup ${call.talkgroup}`}
                        </h3>
                        <span class="status-badge finished shrink-0">Finished</span>
                    </div>
                    <div class="grid grid-cols-[max-content,1fr] gap-x-2 gap-y-1 text-sm mt-1">
                        <span class="font-medium">System:</span><span class="truncate">{call.sys_name}</span>
                        <span class="font-medium">Freq:</span><span>{formatFrequency(call.freq)}</span>
                        {#if call.talkgroup_description}
                            <span class="font-medium">Desc:</span><span class="truncate">{call.talkgroup_description}</span>
                        {/if}
                        <span class="font-medium">Start:</span><span>{new Date(call.start_time * 1000).toLocaleTimeString()}</span>
                        <span class="font-medium">Dur:</span><span>{formatDuration(call.elapsed)}</span>
                        <span class="font-medium">End:</span><span>{new Date(call.finishedAt).toLocaleTimeString()}</span>
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
        @apply bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100;
    }
    
    .encrypted {
        @apply bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100;
    }
    
    .recording {
        @apply bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100;
    }
    
    .monitoring {
        @apply bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100;
    }

    .finished {
        @apply bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200;
    }
</style>
