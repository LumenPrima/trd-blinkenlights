<script>
    import { processTranscriptionSegments } from '$lib/utils/transcription.js';

    /** @type {{ segments: any[] }} */
    export let transcription;

    $: segments = processTranscriptionSegments(transcription);
</script>

<div class="space-y-1.5">
    {#each segments as segment}
        <div class="flex gap-1 items-baseline">
            <!-- Icons -->
            <div class="w-4 flex justify-end">
                {#if segment.hasError}
                    <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                {:else if segment.lowConfidence}
                    <svg class="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                {/if}
            </div>

            <div class="flex-1 min-w-0">
                <!-- Unit ID -->
                {#if segment.showUnit && segment.sources?.length}
                    <div class="flex gap-1 mb-0.5">
                        {#each segment.sources as source}
                            <span class="px-1 py-px text-xs font-mono bg-gray-100 dark:bg-gray-900 rounded text-gray-700 dark:text-gray-300">
                                {source.id}
                            </span>
                        {/each}
                    </div>
                {/if}

                <!-- Message -->
                <div class="text-sm leading-tight text-gray-900 dark:text-gray-100">
                    {segment.words.map(w => w.word).join(' ')}
                </div>
            </div>
        </div>
    {/each}
</div>
