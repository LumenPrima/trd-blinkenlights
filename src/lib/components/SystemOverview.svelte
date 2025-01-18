<script>
    /** @type {{ data: { systems: any[], rates: any[], rateHistory: Map<string, any[]> } }} */
    let { data } = $props();

    function getSystemRate(systemName) {
        const rate = data.rates.find(r => r.sys_name === systemName);
        return rate ? rate.decoderate.toFixed(2) : '0.00';
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each data.systems as system}
        <div class="border border-gray-200 dark:border-gray-700 p-4 rounded bg-white dark:bg-gray-800 shadow-sm">
            <h3 class="text-lg font-bold mb-2">{system.sys_name}</h3>
            <div class="space-y-1">
                <p><span class="font-medium">Type:</span> {system.type.toUpperCase()}</p>
                <p><span class="font-medium">NAC:</span> {system.nac}</p>
                <p><span class="font-medium">WACN:</span> {system.wacn}</p>
                <p><span class="font-medium">RFSS:</span> {system.rfss}</p>
                <p><span class="font-medium">Site:</span> {system.site_id}</p>
                <p><span class="font-medium">Current Rate:</span> {getSystemRate(system.sys_name)} msg/s</p>
            </div>
        </div>
    {/each}
</div>
