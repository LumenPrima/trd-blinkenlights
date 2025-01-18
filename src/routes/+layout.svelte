<script>
    import '../app.css';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<div class="min-h-screen">
    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex-shrink-0">
                    <h1 class="text-xl font-bold">TRD Blinkenlights</h1>
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
