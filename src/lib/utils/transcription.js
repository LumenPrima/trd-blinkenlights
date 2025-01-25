/**
 * Process transcription segments to add display metadata
 * Used by both TranscriptionDisplay.svelte and flag-call server
 * @param {{ segments: any[] }} transcription
 * @returns {any[]} Processed segments with display metadata
 */
export function processTranscriptionSegments(transcription) {
    if (!transcription?.segments) return [];
    
    return transcription.segments.map((segment, index) => {
        const currentUnit = segment.sources?.[0]?.id;
        const prevUnit = index > 0 ? transcription.segments[index - 1].sources?.[0]?.id : null;
        return {
            ...segment,
            showUnit: currentUnit !== prevUnit, // Only show unit ID when it changes
            hasError: segment.quality_metrics.error_count > 0,
            lowConfidence: segment.quality_metrics.avg_logprob < -0.5
        };
    });
}
