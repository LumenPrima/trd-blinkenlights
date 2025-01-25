import * as mqtt from 'mqtt';
import { config } from '../../src/lib/config.js';
import fs from 'fs';
import path from 'path';

// Counter for received messages per topic
const messageCount = {};
const MAX_MESSAGES = 2;
const TIMEOUT = 60000; // 1 minute in milliseconds

// Connect to MQTT broker
console.log(`Connecting to MQTT broker at ${config.mqtt.broker}...`);
const client = mqtt.connect(config.mqtt.broker);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    // Subscribe to all topics using wildcard
    client.subscribe('#');
    console.log('Subscribing to all topics (#)');
    
    // Set timeout
    setTimeout(() => {
        console.log('\nTimeout reached (1 minute). Summary of captured messages:');
        Object.entries(messageCount).forEach(([topic, count]) => {
            console.log(`${topic}: ${count} messages`);
        });
        client.end();
        process.exit(0);
    }, TIMEOUT);
});

client.on('message', (topic, message) => {
    // Initialize counter for new topics
    if (!messageCount[topic]) {
        messageCount[topic] = 0;
        // Create directory for this topic
        const dir = path.join('mqtt-analysis', topic.replace(/\//g, '_'));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    // Only save if we need more messages of this type
    if (messageCount[topic] < MAX_MESSAGES) {
        messageCount[topic]++;
        
        try {
            const data = JSON.parse(message.toString());
            const filename = path.join(
                'mqtt-analysis', 
                topic.replace(/\//g, '_'), 
                `message_${messageCount[topic]}.json`
            );
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`Saved ${topic} message ${messageCount[topic]} to ${filename}`);
        } catch (error) {
            // If message isn't JSON, save as raw text
            const filename = path.join(
                'mqtt-analysis', 
                topic.replace(/\//g, '_'), 
                `message_${messageCount[topic]}.txt`
            );
            fs.writeFileSync(filename, message.toString());
            console.log(`Saved ${topic} message ${messageCount[topic]} to ${filename} (raw text)`);
        }
    }
});

client.on('error', (error) => {
    console.error('MQTT client error:', error);
    process.exit(1);
});

// Handle script termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Summary of captured messages:');
    Object.entries(messageCount).forEach(([topic, count]) => {
        console.log(`${topic}: ${count} messages`);
    });
    client.end();
    process.exit(0);
});
