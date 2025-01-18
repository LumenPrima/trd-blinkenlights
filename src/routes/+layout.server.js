import { recorders } from '$lib/server/state.svelte.js';

/** @type {import('./$types').LayoutServerLoad} */
export function load() {
    return {
        recorders: Array.from(recorders.values())
    };
}
