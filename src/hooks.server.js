import * as mqtt from 'mqtt';
import * as state from '$lib/server/state.svelte.js';
import { invalidate } from '$app/navigation';

let client;
let subscribers = new Set();

function notifySubscribers() {
    subscribers.forEach(subscriber => subscriber());
}

let initialized = false;

async function init() {
    // Connect to MQTT broker
    client = mqtt.connect('mqtt://localhost');

    client.on('connect', () => {
        // Subscribe to relevant topics
        client.subscribe('tr-mqtt/main/#');
    });

    client.on('message', (topic, message) => {
        const data = JSON.parse(message.toString());

        switch (topic) {
            case 'tr-mqtt/main/systems':
                state.updateSystems(data.systems);
                notifySubscribers();
                break;
            case 'tr-mqtt/main/rates':
                state.updateRates(data.rates);
                notifySubscribers();
                break;
            case 'tr-mqtt/main/calls_active':
                state.updateCalls(data.calls);
                notifySubscribers();
                break;
            case 'tr-mqtt/main/recorders':
                state.updateRecorders(data.recorders);
                notifySubscribers();
                break;
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
                        // If controller is closed, remove the subscriber
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
                // Clean up any resources when the stream is cancelled
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
