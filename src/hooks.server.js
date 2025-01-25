import * as mqtt from 'mqtt';
import * as state from '$lib/server/state.svelte.js';
import { config } from '$lib/config.js';

let client;
let subscribers = new Set();

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

    // Handle SSE endpoint
    if (event.url.pathname === '/api/sse') {
        const stream = new ReadableStream({
            start(controller) {
                const subscriber = () => {
                    try {
                        controller.enqueue('data: update\n\n');
                    } catch (error) {
                        subscribers.delete(subscriber);
                    }
                };
                
                subscribers.add(subscriber);
                console.log(`Client connected. Total clients: ${subscribers.size}`);

                // Clean up on connection close
                event.platform?.on('close', () => {
                    subscribers.delete(subscriber);
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

    return resolve(event);
}
