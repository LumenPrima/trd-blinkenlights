export const config = {
    mqtt: {
        // MQTT broker connection settings
        broker: process.env.MQTT_BROKER_URL || 'mqtt://localhost',
        topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'tr-mqtt/main',
    },
    whisper: {
        // Whisper API configuration
        apiUrl: process.env.WHISPER_API_URL || 'http://localhost:8000/v1/audio/transcriptions',
        model: process.env.WHISPER_MODEL || 'Systran/faster-whisper-base.en',
    },
    system: {
        // System-wide constants
        callCleanupInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
        maxRecentCalls: 100,
        maxRateHistory: 100,
    }
};
