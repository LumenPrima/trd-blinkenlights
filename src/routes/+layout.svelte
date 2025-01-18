<script>
    import '../app.css';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import StatusDots from '$lib/components/StatusDots.svelte';

    /** @type {import('./$types').LayoutData} */
    export let data;
</script>

<div class="min-h-screen">
    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex-shrink-0 flex items-center">
                    <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">TRD Blinkenlights</h1>
                    <StatusDots {data} />
                </div>
                <div class="flex items-center">
                    <ThemeToggle />
                </div>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
    </main>
</div>
