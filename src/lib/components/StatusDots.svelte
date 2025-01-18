<script>
    /** @type {{ recorders: any[] }} */
    let { data } = $props();

    function getStateClasses(state) {
        const baseClasses = "w-2 h-2 rounded-full transition-all duration-200";
        switch (state) {
            case 'RECORDING':
                return `${baseClasses} bg-green-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.5)]`;
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
            class={getStateClasses(recorder.rec_state_type)}
            role="status"
            aria-label="Recorder {recorder.rec_num} status: {recorder.rec_state_type}"
            title="Recorder {recorder.rec_num}: {recorder.rec_state_type}"
        ></div>
    {/each}
</div>
