import { systems, rates, rateHistory, calls, recorders } from '$lib/server/state.svelte.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    return {
        systems,
        rates,
        rateHistory,
        calls: Array.from(calls.values()),
        recorders: Array.from(recorders.values())
    };
}
