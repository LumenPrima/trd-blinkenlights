import * as mqtt from 'mqtt';
import { config } from '../../../src/lib/config.js';
import fs from 'fs';

// Counter for received messages per topic
const messageCount = {
    audio: 0,
    calls_active: 0
};
const MAX_MESSAGES = 2; // Capture 2 messages of each type

// Connect to MQTT broker
console.log(`Connecting to MQTT broker at ${config.mqtt.broker}...`);
const client = mqtt.connect(config.mqtt.broker);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    // Subscribe to both topics
    const topics = [
        `${config.mqtt.topicPrefix}/audio`,
        `${config.mqtt.topicPrefix}/calls_active`
    ];
    topics.forEach(topic => {
        console.log(`Subscribing to topic: ${topic}`);
        client.subscribe(topic);
    });
});

client.on('message', (topic, message) => {
    const topicType = topic.endsWith('/audio') ? 'audio' : 'calls_active';
    messageCount[topicType]++;
    
    try {
        const data = JSON.parse(message.toString());
        const filename = `${topicType}_message_${messageCount[topicType]}.json`;
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`Saved ${topicType} message ${messageCount[topicType]} to ${filename}`);
        
        // Exit if we have enough messages of both types
        if (messageCount.audio >= MAX_MESSAGES && messageCount.calls_active >= MAX_MESSAGES) {
            console.log('\nReceived enough messages of each type. Exiting...');
            client.end();
            process.exit(0);
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

client.on('error', (error) => {
    console.error('MQTT client error:', error);
    process.exit(1);
});
