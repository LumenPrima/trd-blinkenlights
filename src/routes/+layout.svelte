<script>
    import '../app.css';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import StatusDots from '$lib/components/StatusDots.svelte';
    import ClientMetrics from '$lib/components/ClientMetrics.svelte';
    import AudioPlayer from '$lib/components/AudioPlayer.svelte';
    import { audioPlayer } from '$lib/stores/audio.js';

    /** @type {import('./$types').LayoutData} */
    export let data;

    let player;
    $: if (player) {
        audioPlayer.set(player);
    }
</script>

<div class="min-h-screen">
    <nav class="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex-shrink-0 flex items-center">
                        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">TRD Blinkenlights</h1>
                        <StatusDots {data} />
                    </div>
                    <div class="flex items-center">
                        <ThemeToggle />
                    </div>
                </div>
                <AudioPlayer bind:this={player} />
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-24">
        <slot />
        <div class="mt-8">
            <ClientMetrics />
        </div>
    </main>
</div>
