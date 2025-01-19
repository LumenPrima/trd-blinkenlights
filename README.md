# TRD Blinkenlights

## Configuration

The application can be configured using environment variables:

### MQTT Settings
- `MQTT_BROKER_URL` - MQTT broker URL (default: mqtt://localhost)
- `MQTT_TOPIC_PREFIX` - MQTT topic prefix (default: tr-mqtt/main)

### Whisper API Settings
- `WHISPER_API_URL` - Whisper API endpoint URL (default: http://localhost:8000/v1/audio/transcriptions)
- `WHISPER_MODEL` - Whisper model to use (default: Systran/faster-whisper-base.en)

### System Settings
These values can be overridden by environment variables but generally should use the defaults:
- Call cleanup interval: 30 minutes
- Maximum recent calls: 100
- Maximum rate history points: 100

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Production

```bash
npm run start
