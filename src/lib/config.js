import { env } from '$env/dynamic/private';

export const config = {
    mqtt: {
        // MQTT broker connection settings
        broker: env.MQTT_BROKER_URL || 'mqtt://localhost',
        topicPrefix: env.MQTT_TOPIC_PREFIX || 'tr-mqtt/main',
    },
    whisper: {
        // Whisper API configuration
        apiUrl: env.WHISPER_API_URL || 'http://localhost:8000/v1/audio/transcriptions',
        model: env.WHISPER_MODEL || 'guillaumekln/faster-whisper-tiny.en',
    },
    system: {
        // System-wide constants
        callCleanupInterval: parseInt(env.CALL_CLEANUP_INTERVAL) || 30 * 60 * 1000, // 30 minutes in milliseconds
        maxRecentCalls: parseInt(env.MAX_RECENT_CALLS) || 100,
        maxRateHistory: parseInt(env.MAX_RATE_HISTORY) || 100,
    }
};
