import { systems, rates, rateHistory, calls, recorders, recentCalls } from '$lib/server/state.svelte.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    // Convert Maps to arrays more efficiently
    const callsArray = [];
    const recordersArray = [];
    const recentCallsArray = [];

    // Limit the number of items processed at once
    let count = 0;
    for (const call of calls.values()) {
        callsArray.push(call);
        if (++count >= 100) break; // Limit to 100 active calls
    }

    count = 0;
    for (const recorder of recorders.values()) {
        recordersArray.push(recorder);
        if (++count >= 50) break; // Limit to 50 recorders
    }

    // Sort recent calls by finishedAt before converting to array
    const sortedRecentCalls = Array.from(recentCalls.entries())
        .sort(([, a], [, b]) => b.finishedAt - a.finishedAt)
        .slice(0, 50); // Limit to 50 recent calls

    for (const [, call] of sortedRecentCalls) {
        recentCallsArray.push(call);
    }

    return {
        systems,
        rates,
        rateHistory: Array.from(rateHistory.entries()).slice(-50), // Limit history
        calls: callsArray,
        recorders: recordersArray,
        recentCalls: recentCallsArray
    };
}
