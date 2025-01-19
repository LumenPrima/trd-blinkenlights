<script>
    /** @type {{ segments: any[] }} */
    export let transcription;

    $: segments = transcription.segments.map((segment, index) => {
        const currentUnit = segment.sources?.[0]?.id;
        const prevUnit = index > 0 ? transcription.segments[index - 1].sources?.[0]?.id : null;
        return {
            ...segment,
            showUnit: currentUnit !== prevUnit,
            hasError: segment.quality_metrics.error_count > 0,
            lowConfidence: segment.quality_metrics.avg_logprob < -0.5
        };
    });
</script>

<div class="space-y-3">
    {#each segments as segment}
        <div class="flex gap-1 items-start">
            <!-- Icons -->
            <div class="w-4 flex justify-end pt-0.5">
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
                    <div class="flex gap-1 mb-1">
                        {#each segment.sources as source}
                            <span class="px-1 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                                {source.id}
                            </span>
                        {/each}
                    </div>
                {/if}

                <!-- Message -->
                <div class="text-sm text-gray-900 dark:text-gray-100">
                    {segment.words.map(w => w.word).join(' ')}
                </div>
            </div>
        </div>
    {/each}
</div>
