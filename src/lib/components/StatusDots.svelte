<script>
    /** @type {{ recorders: any[] }} */
    let { data } = $props();

    let lastStates = new Map();

    function getStateClasses(recorder) {
        const baseClasses = "w-3 h-3 rounded-full transition-all duration-200";
        const currentState = recorder.rec_state_type;
        const lastState = lastStates.get(recorder.id);
        
        // Update last state
        lastStates.set(recorder.id, currentState);
        
        // Only add animation if state just changed to RECORDING
        const shouldAnimate = currentState === 'RECORDING' && lastState !== 'RECORDING';
        
        switch (currentState) {
            case 'RECORDING':
                return `${baseClasses} bg-green-500 ${shouldAnimate ? 'animate-[pulse_1s_ease-in-out_1]' : ''} shadow-[0_0_4px_rgba(16,185,129,0.5)]`;
            case 'IDLE':
                return `${baseClasses} bg-yellow-500 opacity-70 hover:opacity-100`;
            case 'AVAILABLE':
                return `${baseClasses} bg-blue-500 opacity-70 hover:opacity-100`;
            default:
                return `${baseClasses} bg-gray-500 opacity-70 hover:opacity-100`;
        }
    }
</script>

<div class="flex gap-1.5 items-center ml-3">
    {#each data.recorders as recorder}
        <div 
            class={getStateClasses(recorder)}
            role="status"
            aria-label="Recorder {recorder.rec_num} status: {recorder.rec_state_type}"
            title="Recorder {recorder.rec_num}: {recorder.rec_state_type}"
        ></div>
    {/each}
</div>
