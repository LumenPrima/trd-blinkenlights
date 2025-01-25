import { systems, rates, rateHistory, calls, recorders, recentCalls } from '$lib/server/state.svelte.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    return {
        systems,
        rates,
        rateHistory: Object.fromEntries(rateHistory),
        calls: Array.from(calls.values()).map(call => ({
            ...call,
            audio: undefined,
            originalMessage: undefined
        })),
        recorders: Array.from(recorders.values()),
        recentCalls: Array.from(recentCalls.values()).map(call => ({
            ...call,
            audio: undefined,
            originalMessage: undefined,
            whisperResult: undefined
        }))
    };
}
