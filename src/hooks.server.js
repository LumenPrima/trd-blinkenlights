import * as mqtt from 'mqtt';
import * as state from '$lib/server/state.svelte.js';
import { config } from '$lib/config.js';
import { Buffer } from 'buffer';

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
        
        const stream = new ReadableStream({
            start(controller) {
                audioMetrics.set(clientId, {
                    connectedAt: Date.now(),
                    audioBytes: 0,
                    audioMessages: 0,
                    ip: event.getClientAddress(),
                    userAgent: event.request.headers.get('user-agent')
                });

                const subscriber = (audioData) => {
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

                const subscriber = () => {
                    const message = 'data: update\n\n';
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
