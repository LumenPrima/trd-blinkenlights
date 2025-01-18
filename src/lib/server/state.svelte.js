import { SvelteMap } from 'svelte/reactivity';

// System state
export const systems = $state([]);

export function updateSystems(data) {
    if (!data) return;
    
    // Clear and update systems array
    systems.length = 0;
    systems.push(...data);
}

export const rates = $state([]);
export const calls = $state(new SvelteMap());
export const recorders = $state(new SvelteMap());

// Keep track of rate history for graphs
const MAX_HISTORY = 100;
export const rateHistory = $state(new SvelteMap());

// Constants
const CALL_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Update functions
export function updateRates(data) {
    if (!data) return;
    
    // Clear and update rates array
    rates.length = 0;
    rates.push(...data);
    
    // Update history for each system
    data.forEach(rate => {
        const history = rateHistory.get(rate.sys_name) || [];
        history.push({
            time: new Date(),
            rate: rate.decoderate,
            control: rate.control_channel
        });
        
        // Maintain fixed size
        if (history.length > MAX_HISTORY) {
            history.shift();
        }
        
        rateHistory.set(rate.sys_name, history);
    });
}

export function updateCalls(callsData) {
    if (!callsData) return;
    
    const now = Date.now();
    const activeCallIds = new Set(callsData.map(call => call.id));
    
    // Update or add new calls
    callsData.forEach(call => {
        const existingCall = calls.get(call.id);
        if (existingCall) {
            // Update existing call
            calls.set(call.id, { ...call, lastSeen: now });
        } else {
            // Add new call
            calls.set(call.id, { ...call, lastSeen: now, firstSeen: now });
        }
    });
    
    // Mark calls not in the active list as finished
    calls.forEach((call, id) => {
        if (!activeCallIds.has(id) && !call.finished) {
            calls.set(id, { ...call, finished: true, finishedAt: now });
        }
    });
    
    // Clean up old finished calls
    calls.forEach((call, id) => {
        if (call.finished && (now - call.finishedAt) > CALL_CLEANUP_INTERVAL) {
            calls.delete(id);
        }
    });
}

export function updateRecorders(recordersData) {
    if (!recordersData) return;
    
    recordersData.forEach(recorder => {
        recorders.set(recorder.id, recorder);
    });
}
