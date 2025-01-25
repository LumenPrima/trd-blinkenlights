<script>
    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    import SystemOverview from '$lib/components/SystemOverview.svelte';
    import ActiveCalls from '$lib/components/ActiveCalls.svelte';
    import Recorders from '$lib/components/Recorders.svelte';

    /** @type {{ data: import('./$types').PageData }} */
    let { data } = $props();

    let activeTab = $state('overview');

    onMount(() => {
        const eventSource = new EventSource('/api/sse');
        const audioEventSource = new EventSource('/api/sse/audio');
        
        eventSource.onmessage = () => {
            invalidateAll();
        };

        audioEventSource.onmessage = (e) => {
            const audioEvent = JSON.parse(e.data);
            console.log('Audio event:', audioEvent);
        };

        return () => {
            eventSource.close();
            audioEventSource.close();
        };
    });
</script>

<div class="container mx-auto p-4">
    <nav class="mb-4">
        <button 
            class:active={activeTab === 'overview'}
            onclick={() => activeTab = 'overview'}>
            System Overview
        </button>
        <button 
            class:active={activeTab === 'calls'}
            onclick={() => activeTab = 'calls'}>
            Active Calls
        </button>
        <button 
            class:active={activeTab === 'recorders'}
            onclick={() => activeTab = 'recorders'}>
            Recorders
        </button>
    </nav>

    {#if activeTab === 'overview'}
        <SystemOverview {data} />
    {:else if activeTab === 'calls'}
        <ActiveCalls {data} />
    {:else}
        <Recorders {data} />
    {/if}
</div>

<style>
    button {
        padding: 0.5rem 1rem;
        margin-right: 0.5rem;
    }
    
    button.active {
        background-color: #007bff;
        color: white;
        border-radius: 0.25rem;
    }
</style>
