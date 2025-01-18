<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import uPlot from 'uplot';
    import 'uplot/dist/uPlot.min.css';
    
    /** @type {{ data: { systems: any[], rates: any[], rateHistory: Map<string, any[]> } }} */
    let { data } = $props();

    function getSystemRate(systemName) {
        const rate = data.rates.find(r => r.sys_name === systemName);
        return rate ? rate.decoderate.toFixed(2) : '0.00';
    }

    function formatRateHistory(history) {
        if (!history || !Array.isArray(history)) return [[], []];
        const timestamps = [];
        const values = [];
        
        history.forEach(entry => {
            timestamps.push(new Date(entry.time).getTime() / 1000);
            values.push(parseFloat(entry.rate.toFixed(2)));
        });
        
        return [timestamps, values];
    }

    function createChart(element, data) {
        const opts = {
            width: element.clientWidth,
            height: 128,
            class: "dark-theme",
            cursor: {
                show: true,
                points: {
                    show: false
                }
            },
            series: [
                {},
                {
                    stroke: "#10b981",
                    width: 2,
                    fill: "transparent"
                }
            ],
            axes: [
                {
                    show: false
                },
                {
                    show: true,
                    size: 50,
                    stroke: "#4b5563",
                    grid: {
                        show: true,
                        stroke: "#1f2937",
                        width: 1
                    }
                }
            ],
            scales: {
                x: {
                    time: true
                },
                y: {
                    auto: true,
                    range: (min, max) => [0, max * 1.25]
                }
            }
        };

        return new uPlot(opts, data, element);
    }

    function initChart(element, history) {
        if (!browser || !element) return;
        
        let chart;
        let resizeObserver;

        function init() {
            const data = formatRateHistory(history);
            chart = createChart(element, data);

            // Handle resize
            resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    if (chart && entry.contentRect.width > 0) {
                        chart.setSize({
                            width: entry.contentRect.width,
                            height: 128
                        });
                    }
                }
            });
            resizeObserver.observe(element);
        }

        // Initialize the chart
        init();
        
        return {
            update(newHistory) {
                if (chart && newHistory) {
                    const data = formatRateHistory(newHistory);
                    chart.setData(data);
                }
            },
            destroy() {
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
                if (chart) {
                    chart.destroy();
                }
            }
        };
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each data.systems as system}
        <div class="relative border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div class="absolute top-4 right-4 w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">{system.sys_name}</h3>
            </div>

            <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div class="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-2">
                    <span class="font-medium">Type:</span>
                    <span class="font-mono">{system.type.toUpperCase()}</span>
                    
                    <span class="font-medium">NAC:</span>
                    <span class="font-mono">{system.nac}</span>
                    
                    <span class="font-medium">WACN:</span>
                    <span class="font-mono">{system.wacn}</span>
                    
                    <span class="font-medium">RFSS:</span>
                    <span class="font-mono">{system.rfss}</span>
                    
                    <span class="font-medium">Site:</span>
                    <span class="font-mono">{system.site_id}</span>
                </div>

                <div class="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium">Message Rate:</span>
                        <span class="font-mono text-green-600 dark:text-green-400">
                            {getSystemRate(system.sys_name)} msg/s
                        </span>
                    </div>
                    
                    <div class="h-32 -mx-4 -mb-4 bg-gray-900 rounded-b-lg overflow-hidden">
                        {#if browser}
                            <div 
                                class="w-full h-full" 
                                use:initChart={data.rateHistory.get(system.sys_name)}
                                role="img"
                                aria-label="Message rate chart"
                            ></div>
                        {:else}
                            <div class="h-full flex items-center justify-center text-gray-400">
                                Loading chart...
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/each}
</div>
