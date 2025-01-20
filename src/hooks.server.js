import * as mqtt from 'mqtt';
import * as state from '$lib/server/state.svelte.js';
import { config } from '$lib/config.js';

let client;
let subscribers = new Set();
let updateQueue = new Set();
let updateTimeout = null;

// Batch updates and notify subscribers with debouncing
function notifySubscribers() {
    if (updateTimeout) return;
    
    updateTimeout = setTimeout(() => {
        if (updateQueue.size > 0) {
            subscribers.forEach(subscriber => {
                try {
                    subscriber(Array.from(updateQueue));
                } catch (error) {
                    console.error('Subscriber notification failed:', error);
                }
            });
            updateQueue.clear();
        }
        updateTimeout = null;
    }, 100); // Debounce updates by 100ms
}

// Memory-efficient update tracking
function queueUpdate(type) {
    updateQueue.add(type);
    notifySubscribers();
}

let initialized = false;
let messageQueue = [];
let processingQueue = false;

// Process MQTT messages in batches
async function processMessageQueue() {
    if (processingQueue || messageQueue.length === 0) return;
    
    processingQueue = true;
    const batch = messageQueue.splice(0, 50); // Process up to 50 messages at once
    
    try {
        for (const { topic, data } of batch) {
            switch (topic) {
                case `${config.mqtt.topicPrefix}/recorder`:
                    if (data.type === 'recorder' && data.recorder) {
                        state.updateRecorders([data.recorder]);
                        queueUpdate('recorders');
                    }
                    break;
                case `${config.mqtt.topicPrefix}/systems`:
                    state.updateSystems(data.systems);
                    queueUpdate('systems');
                    break;
                case `${config.mqtt.topicPrefix}/rates`:
                    state.updateRates(data.rates);
                    queueUpdate('rates');
                    break;
                case `${config.mqtt.topicPrefix}/calls_active`:
                    state.updateCalls(data.calls);
                    queueUpdate('calls');
                    break;
                case `${config.mqtt.topicPrefix}/recorders`:
                    state.updateRecorders(data.recorders);
                    queueUpdate('recorders');
                    break;
                case `${config.mqtt.topicPrefix}/audio`:
                    state.updateCallAudio(data);
                    queueUpdate('audio');
                    break;
            }
        }
    } finally {
        processingQueue = false;
        if (messageQueue.length > 0) {
            setTimeout(processMessageQueue, 0);
        }
    }
}

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
            messageQueue.push({ topic, data });
            processMessageQueue();
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

    // Handle SSE endpoint with efficient updates
    if (event.url.pathname === '/api/sse') {
        const stream = new ReadableStream({
            start(controller) {
                const subscriber = (updates) => {
                    try {
                        // Send specific update types to reduce payload size
                        controller.enqueue(`data: ${JSON.stringify(updates)}\n\n`);
                    } catch (error) {
                        subscribers.delete(subscriber);
                    }
                };
                
                subscribers.add(subscriber);

                // Clean up on connection close
                event.platform?.on('close', () => {
                    subscribers.delete(subscriber);
                    try {
                        controller.close();
                    } catch (error) {
                        // Ignore if already closed
                    }
                });
            },
            cancel() {
                subscribers.clear();
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

    return resolve(event);
}
