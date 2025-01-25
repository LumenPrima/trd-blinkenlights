<script>
    import TranscriptionDisplay from '$lib/components/TranscriptionDisplay.svelte';
    
    /** @type {{ data: { calls: any[], recentCalls: any[] } }} */
    let { data } = $props();

    function playAudio(call) {
        if (!call.audio?.wav) {
            alert('No audio available for this call');
            return;
        }

        try {
            // Handle both raw base64 and data URI formats
            const base64Data = call.audio.wav.replace(/^data:audio\/wav;base64,/, '');
            
            // Convert to Uint8Array
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Create and play audio
            const audioBlob = new Blob([bytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioElement = new Audio(audioUrl);
            
            audioElement.onended = () => URL.revokeObjectURL(audioUrl);
            audioElement.play();

        } catch (error) {
            console.error('Error processing audio:', error);
            alert('Failed to process audio');
        }
    }

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

    const activeCalls = $derived(data.calls);

    const recentCalls = $derived(
        data.recentCalls.sort((a, b) => b.finishedAt - a.finishedAt)
    );
</script>

<div>
    <h2 class="text-2xl font-bold mb-4">Active Calls</h2>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 overflow-x-auto">
        {#each activeCalls as call}
            <div class="call-card p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 min-w-0">
                <div class="flex justify-between items-start gap-2 mb-2">
                    <h3 class="text-lg font-semibold truncate text-gray-900 dark:text-gray-100">
                    {call.talkgroup_alpha_tag}
                    </h3>
                    <span class="status-badge {getCallStateClass(call)} shrink-0">
                        {call.call_state_type}
                    </span>
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {call.sys_name}
                </div>
                <div class="border-b border-gray-100/50 dark:border-gray-700/30 mb-2"></div>
                    {#if call.talkgroup_description}
                        <div class="text-sm text-gray-700 dark:text-gray-300 mb-2 truncate">
                            {call.talkgroup_description}
                        </div>
                    {/if}
                    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {#if call.talkgroup_group}
                            <div class="truncate">{call.talkgroup_group}</div>
                        {/if}
                        {#if call.unit}
                            <div class="truncate">
                                {call.unit}
                                {#if call.unit_alpha_tag} - {call.unit_alpha_tag}{/if}
                            </div>
                        {/if}
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            Started {new Date(call.start_time * 1000).toLocaleTimeString()} · {formatDuration(call.elapsed)}
                        </div>
                    </div>
            </div>
        {/each}
    </div>

    {#if recentCalls.length > 0}
        <h3 class="text-xl font-bold mt-8 mb-4">Recent Calls</h3>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 overflow-x-auto opacity-75">
            {#each recentCalls as call}
                <div class="call-card border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out min-w-0">
                    <div class="flex justify-between items-start gap-2 mb-2">
                        <h3 class="text-lg font-semibold truncate text-gray-900 dark:text-gray-100">
                            {call.talkgroup_alpha_tag}
                        </h3>
                    </div>
                    <div class="border-b border-gray-100/50 dark:border-gray-700/30 mb-2"></div>
                    {#if call.talkgroup_description}
                        <div class="text-sm text-gray-700 dark:text-gray-300 mb-2 truncate">
                            {call.talkgroup_description}
                        </div>
                    {/if}
                    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            Started {new Date(call.start_time * 1000).toLocaleTimeString()} · {formatDuration(call.elapsed)}
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                            {call.sys_name}
                        </div>
                        <div class="mt-2">
                            {#if call.transcription}
                                {#if typeof call.transcription === 'string'}
                                    <div class="text-sm text-gray-700 dark:text-gray-300 italic border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                                        {call.transcription}
                                    </div>
                                {:else if call.transcription?.segments}
                                    <TranscriptionDisplay transcription={call.transcription} />
                                {/if}
                            {:else if call.originalMessage?.call?.audio_wav_base64}
                                <div class="text-xs text-gray-500 dark:text-gray-400 italic">
                                    Transcription in progress...
                                </div>
                            {/if}
                        </div>
                        <div class="flex gap-2">
                            <button 
                                class="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                on:click={() => playAudio(call)}
                                disabled={!call.audio?.wav}
                            >
                                {#if call.audio?.wav}
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Play Audio
                                {:else}
                                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Processing...
                                {/if}
                            </button>
                            <button 
                                class="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                                on:click={async () => {
                                    try {
                                        const response = await fetch('/flag-call', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(call)
                                        });
                                        const result = await response.json();
                                        if (result.success) {
                                            alert(`Call data saved to ${result.path}`);
                                        } else {
                                            throw new Error(result.error);
                                        }
                                    } catch (error) {
                                        console.error('Error flagging call:', error);
                                        alert('Failed to flag call: ' + error.message);
                                    }
                                }}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                                Flag Call
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
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

    .status-badge .icon {
        @apply w-3 h-3;
    }
    
    .emergency {
        @apply bg-red-500/10 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-500/20 dark:border-red-800/50;
    }
    
    .encrypted {
        @apply bg-purple-500/10 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-500/20 dark:border-purple-800/50;
    }
    
    .recording {
        @apply bg-green-500/10 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-500/20 dark:border-green-800/50;
    }
    
    .monitoring {
        @apply bg-blue-500/10 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-500/20 dark:border-blue-800/50;
    }

    .finished {
        @apply bg-gray-500/10 dark:bg-gray-800/20 text-gray-700 dark:text-gray-400 border border-gray-500/20 dark:border-gray-700/50;
    }
</style>
