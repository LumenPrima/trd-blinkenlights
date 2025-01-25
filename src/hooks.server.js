import * as mqtt from 'mqtt';
import * as state from '$lib/server/state.svelte.js';
import { config } from '$lib/config.js';
import { Buffer } from 'buffer';

// Helper functions for efficient state comparison
function hashCalls(calls) {
    return calls.map(call => `${call.id}:${call.finishedAt}`).join('|');
}

function hasRecorderStateChanges(current, previous) {
    if (current.length !== previous.length) return true;
    
    for (let i = 0; i < current.length; i++) {
        const curr = current[i];
        const prev = previous[i];
        if (curr.rec_state_type !== prev.rec_state_type || 
            curr.last_state_change !== prev.last_state_change) {
            return true;
        }
    }
    return false;
}

function hasRecentCallChanges(current, previous) {
    if (current.length !== previous.length) return true;
    
    const currentIds = new Set(current.map(call => call.id));
    const previousIds = new Set(previous.map(call => call.id));
    
    // Check for added or removed calls
    for (const id of currentIds) {
        if (!previousIds.has(id)) return true;
    }
    for (const id of previousIds) {
        if (!currentIds.has(id)) return true;
    }
    
    // Check for changes in call properties (excluding audio)
    for (let i = 0; i < current.length; i++) {
        const curr = current[i];
        const prev = previous[i];
        if (curr.finishedAt !== prev.finishedAt ||
            curr.elapsed !== prev.elapsed ||
            curr.emergency !== prev.emergency) {
            return true;
        }
    }
    return false;
}

let client;
let subscribers = new Set();
let audioSubscribers = new Set();
const clientMetrics = new Map(); // clientId → { bytesSent, messageCount }
const audioMetrics = new Map(); // clientId → { audioBytes, audioMessages }

function notifySubscribers() {
    subscribers.forEach(subscriber => {
        try {
            subscriber();
        } catch (error) {
            console.error('Subscriber notification failed:', error);
            subscribers.delete(subscriber);
        }
    });
}

let initialized = false;

async function init() {
    // Connect to MQTT broker
    client = mqtt.connect(config.mqtt.broker);

    client.on('connect', () => {
        // Subscribe to relevant topics
        client.subscribe(`${config.mqtt.topicPrefix}/#`);
    });

    client.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            
            const [,,category] = topic.split('/');
            
            // Unified recorder handler
            if (category === 'recorders' || category === 'recorder') {
                const recordersData = data.recorders || [data.recorder];
                state.updateRecorders(recordersData.filter(Boolean));
                notifySubscribers();
            }
            // Handle other message types
            else switch (category) {
                case 'systems':
                    state.updateSystems(data.systems);
                    notifySubscribers();
                    break;
                case 'rates':
                    state.updateRates(data.rates);
                    notifySubscribers();
                    break;
                case 'calls_active':
                    state.updateCalls(data.calls);
                    notifySubscribers();
                    break;
                case 'audio':
                    state.updateCallAudio(data);
                    audioSubscribers.forEach(subscriber => subscriber(data));
                    notifySubscribers();
                    break;
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    });
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    if (!initialized) {
        await init();
        initialized = true;
    }

    // Handle audio SSE endpoint
    if (event.url.pathname === '/api/sse/audio') {
        const clientId = crypto.randomUUID();
        const url = new URL(event.url);
        const talkgroups = url.searchParams.get('talkgroups')?.split(',').map(Number) || [];
        
        const stream = new ReadableStream({
            start(controller) {
                audioMetrics.set(clientId, {
                    connectedAt: Date.now(),
                    audioBytes: 0,
                    audioMessages: 0,
                    ip: event.getClientAddress(),
                    userAgent: event.request.headers.get('user-agent'),
                    filters: { talkgroups }
                });

                const subscriber = (audioData) => {
                    // Apply filters first
                    if (talkgroups.length > 0 && 
                        !talkgroups.includes(audioData.call.metadata.talkgroup)) {
                        return;
                    }
                    
                    try {
                        const message = JSON.stringify({
                            type: 'audio',
                            data: {
                                id: audioData.call.metadata.start_time,
                                size: Buffer.byteLength(audioData.call.audio_wav_base64, 'base64'),
                                metadata: audioData.call.metadata
                            }
                        });
                        const encoded = `data: ${message}\n\n`;
                        const byteLength = Buffer.byteLength(encoded);
                        
                        // Update metrics only for this client
                        const metrics = audioMetrics.get(clientId);
                        if (metrics) {
                            metrics.audioBytes += byteLength;
                            metrics.audioMessages++;
                        }
                        
                        controller.enqueue(encoded);
                    } catch (error) {
                        audioSubscribers.delete(subscriber);
                        audioMetrics.delete(clientId);
                    }
                };

                audioSubscribers.add(subscriber);
                console.log(`Audio client connected. Total audio clients: ${audioSubscribers.size}`);
                
                event.platform?.on('close', () => {
                    audioSubscribers.delete(subscriber);
                    audioMetrics.delete(clientId);
                    console.log(`Audio client disconnected. Total audio clients: ${audioSubscribers.size}`);
                });
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        });
    }

    // Handle regular SSE endpoint
    if (event.url.pathname === '/api/sse') {
        const clientId = crypto.randomUUID();
        
        const stream = new ReadableStream({
            start(controller) {
                clientMetrics.set(clientId, {
                    connectedAt: Date.now(),
                    bytesSent: 0,
                    messageCount: 0,
                    ip: event.getClientAddress(),
                    userAgent: event.request.headers.get('user-agent')
                });

                // Keep track of previous state for this client
                let previousState = {
                    systems: [],
                    rates: [],
                    rateHistory: {},
                    calls: [],
                    recorders: [],
                    recentCalls: []
                };

                const subscriber = () => {
                    // Create minimal state without audio data
                    const currentState = {
                        systems: state.systems,
                        rates: state.rates,
                        rateHistory: Object.fromEntries(state.rateHistory),
                        calls: Array.from(state.calls.values()).map(call => ({
                            ...call,
                            audio: undefined,
                            originalMessage: undefined
                        })),
                        recorders: Array.from(state.recorders.values()),
                        recentCalls: Array.from(state.recentCalls.values()).map(call => ({
                            ...call,
                            audio: undefined,
                            originalMessage: undefined,
                            whisperResult: undefined
                        }))
                    };

                    // Calculate changes more efficiently
                    const changes = {};
                    
                    // Simple array comparisons for systems and rates
                    if (currentState.systems.length !== previousState.systems.length) {
                        changes.systems = currentState.systems;
                    }
                    if (currentState.rates.length !== previousState.rates.length) {
                        changes.rates = currentState.rates;
                    }
                    
                    // Compare calls by ID and content hash
                    const currentCallsHash = hashCalls(currentState.calls);
                    const prevCallsHash = hashCalls(previousState.calls);
                    if (currentCallsHash !== prevCallsHash) {
                        changes.calls = currentState.calls;
                    }
                    
                    // Compare recorders by state type changes
                    if (hasRecorderStateChanges(currentState.recorders, previousState.recorders)) {
                        changes.recorders = currentState.recorders;
                    }
                    
                    // Compare recent calls by ID only since audio is separate
                    if (hasRecentCallChanges(currentState.recentCalls, previousState.recentCalls)) {
                        changes.recentCalls = currentState.recentCalls.map(call => ({
                            ...call,
                            audio: undefined // Ensure audio is not included
                        }));
                    }
                    
                    // Compare rate history by keys
                    const currentKeys = Object.keys(currentState.rateHistory);
                    const previousKeys = Object.keys(previousState.rateHistory);
                    if (currentKeys.length !== previousKeys.length || 
                        currentKeys.some(key => !previousState.rateHistory[key])) {
                        changes.rateHistory = currentState.rateHistory;
                    }

                    // Only send if there are changes
                    const hasChanges = Object.values(changes).some(v => v !== undefined);
                    if (!hasChanges) return;

                    // Update previous state
                    previousState = {
                        systems: [...currentState.systems],
                        rates: [...currentState.rates],
                        rateHistory: currentState.rateHistory,
                        calls: [...currentState.calls],
                        recorders: [...currentState.recorders],
                        recentCalls: [...currentState.recentCalls]
                    };

                    const message = `data: ${JSON.stringify(changes)}\n\n`;
                    const byteLength = Buffer.byteLength(message, 'utf8');
                    
                    const metrics = clientMetrics.get(clientId);
                    if (metrics) {
                        metrics.bytesSent += byteLength;
                        metrics.messageCount++;
                    }
                    
                    try {
                        controller.enqueue(message);
                    } catch (error) {
                        subscribers.delete(subscriber);
                        clientMetrics.delete(clientId);
                    }
                };
                
                subscribers.add(subscriber);
                console.log(`Client connected. Total clients: ${subscribers.size}`);

                // Clean up on connection close
                event.platform?.on('close', () => {
                    subscribers.delete(subscriber);
                    if (clientMetrics.has(clientId)) {
                        clientMetrics.get(clientId).disconnectedAt = Date.now();
                    }
                    console.log(`Client disconnected. Total clients: ${subscribers.size}`);
                    try {
                        controller.close();
                    } catch (error) {
                        // Ignore if already closed
                    }
                });
            },
            cancel() {
                subscribers.delete(subscriber);  // Only remove this subscriber
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        });
    }

    // Handle metrics endpoint
    if (event.url.pathname === '/api/metrics') {
        // Calculate totals from client-specific metrics
        const totalAudioBytes = Array.from(audioMetrics.values())
            .reduce((sum, m) => sum + m.audioBytes, 0);
            
        const totalAudioMessages = Array.from(audioMetrics.values())
            .reduce((sum, m) => sum + m.audioMessages, 0);

        return new Response(JSON.stringify({
            totalClients: clientMetrics.size,
            totalBytes: Array.from(clientMetrics.values())
                .reduce((sum, m) => sum + m.bytesSent, 0),
            totalMessages: Array.from(clientMetrics.values())
                .reduce((sum, m) => sum + m.messageCount, 0),
            totalAudioClients: audioSubscribers.size,
            totalAudioMessages,
            totalAudioBytes,
            totalData: Array.from(clientMetrics.values())
                .reduce((sum, m) => sum + m.bytesSent, 0) + totalAudioBytes,
            clients: Object.fromEntries(clientMetrics),
            audioClients: Object.fromEntries(audioMetrics)
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return resolve(event);
}
