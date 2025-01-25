<script>
    import { onMount } from 'svelte';

    let audioElement;
    let currentCall = $state(null);
    let isPlaying = $state(false);
    let startTime = $state(null);
    let elapsed = $state(0);
    let timer;

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateElapsed() {
        if (startTime && isPlaying) {
            elapsed = (Date.now() - startTime) / 1000;
        }
    }

    export function playCall(call) {
        if (!call?.hasAudio) return;
        
        currentCall = call;
        startTime = Date.now();
        elapsed = 0;
        
        const audioUrl = `/audio/${call.id}`;
        
        if (audioElement) {
            audioElement.src = audioUrl;
            audioElement.play().catch(error => {
                // Ignore autoplay restrictions
                if (error.name !== 'NotAllowedError') {
                    console.error('Error playing audio:', error);
                }
            });
        }

        // Start timer for elapsed time
        if (timer) clearInterval(timer);
        timer = setInterval(updateElapsed, 100);
    }

    onMount(() => {
        if (audioElement) {
            audioElement.onplay = () => {
                isPlaying = true;
                if (!startTime) startTime = Date.now();
                if (!timer) timer = setInterval(updateElapsed, 100);
            };
            audioElement.onpause = () => {
                isPlaying = false;
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
            };
            audioElement.onended = () => {
                isPlaying = false;
                currentCall = null;
                startTime = null;
                elapsed = 0;
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
            };
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    });
</script>

<div class="overflow-hidden transition-[height] duration-200 ease-in-out {currentCall ? 'h-12' : 'h-0'}">
    <div class="py-2">
        <div class="flex items-center justify-between gap-4">
            {#if currentCall}
                <div class="flex-1 min-w-0 flex items-center gap-2">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {currentCall.talkgroup_alpha_tag}
                    </h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                        {currentCall.sys_name}
                    </span>
                    <span class="text-xs text-gray-600 dark:text-gray-400">·</span>
                    <p class="text-xs text-gray-600 dark:text-gray-400 truncate">{currentCall.talkgroup_description}</p>
                    <span class="text-xs text-gray-600 dark:text-gray-400 shrink-0">· {formatDuration(elapsed)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button 
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        on:click={() => audioElement?.play()}
                        disabled={isPlaying}
                    >
                        <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button 
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        on:click={() => audioElement?.pause()}
                        disabled={!isPlaying}
                    >
                        <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button 
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        on:click={() => currentCall = null}
                    >
                        <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            {/if}
        </div>
    </div>
    <audio 
        bind:this={audioElement}
        preload="auto"
    />
</div>
