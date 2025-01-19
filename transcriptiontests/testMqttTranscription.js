import * as mqtt from 'mqtt';
import { config } from '../src/lib/config.js';
import fs from 'fs';
import pkg from 'undici';
const { FormData, File, fetch } = pkg;

// Counter for received messages
let messageCount = 0;
const MAX_MESSAGES = 10;

// Connect to MQTT broker
console.log(`Connecting to MQTT broker at ${config.mqtt.broker}...`);
const client = mqtt.connect(config.mqtt.broker);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    const topic = `${config.mqtt.topicPrefix}/audio`;
    console.log(`Subscribing to topic: ${topic}`);
    client.subscribe(topic);
});

client.on('message', async (topic, message) => {
    messageCount++;
    console.log(`\n[${messageCount}/${MAX_MESSAGES}] Received message on topic: ${topic}`);
    
    try {
        const data = JSON.parse(message.toString());
        console.log('Message metadata:', {
            talkgroup: data.call.metadata.talkgroup,
            talkgroup_tag: data.call.metadata.talkgroup_tag,
            start_time: new Date(data.call.metadata.start_time * 1000).toISOString(),
            call_length: data.call.metadata.call_length
        });

        // Process audio if WAV is available
        if (data.call.audio_wav_base64) {
            console.log('Processing audio transcription...');
            
            // Convert base64 to binary
            const binaryData = Buffer.from(data.call.audio_wav_base64, 'base64');
            // Create form data with WAV blob
            const formData = new FormData();
            const wavBlob = new Blob([binaryData], { type: 'audio/wav' });
            formData.append('file', wavBlob, 'audio.wav');
            formData.append('model', config.whisper.model);
            formData.append('response_format', 'verbose_json');
            formData.append('timestamp_granularities[]', 'word');
            
            // Send to Whisper API
            console.log('Sending to Whisper API...');
            const response = await fetch(config.whisper.apiUrl, {
                method: 'POST',
                body: formData,
                duplex: 'half'
            });
            
            console.log('Whisper API response status:', response.status);
            const responseText = await response.text();
            
            if (response.ok) {
                const result = JSON.parse(responseText);
                
                // Create enhanced transcription with metadata
                const transcription = {
                    call_info: {
                        talkgroup: {
                            id: data.call.metadata.talkgroup,
                            tag: data.call.metadata.talkgroup_tag,
                            description: data.call.metadata.talkgroup_description || '',
                            group: data.call.metadata.talkgroup_group || ''
                        },
                        timing: {
                            start_time: new Date(data.call.metadata.start_time * 1000).toISOString(),
                            duration: result.duration,
                            call_length: data.call.metadata.call_length
                        },
                        emergency: data.call.metadata.emergency === 1,
                        priority: data.call.metadata.priority === 1
                    },
                    segments: result.segments
                        // Only merge segments that are close in time with same text
                        .reduce((acc, segment) => {
                            const text = segment.text.trim();
                            const lastSegment = acc[acc.length - 1];
                            
                            if (lastSegment && 
                                lastSegment.text === text && 
                                Math.abs(segment.start - lastSegment.end) < 1.0) {
                                // Merge with previous segment
                                lastSegment.end = segment.end;
                                return acc;
                            }
                            
                            acc.push(segment);
                            return acc;
                        }, [])
                        .map(segment => {
                        // Find sources active during this segment
                        const activeSources = data.call.metadata.srcList?.filter(src => 
                            src.pos >= segment.start && src.pos <= segment.end
                        ) || [];
                        
                        // Find frequency data during this segment
                        const freqData = data.call.metadata.freqList?.filter(freq =>
                            freq.pos >= segment.start && freq.pos <= segment.end
                        ) || [];

                        // Calculate segment quality metrics
                        const totalErrors = freqData.reduce((sum, freq) => sum + (freq.error_count || 0), 0);
                        const totalSpikes = freqData.reduce((sum, freq) => sum + (freq.spike_count || 0), 0);
                        
                        return {
                            text: segment.text.trim(),
                            timestamp: new Date((data.call.metadata.start_time + segment.start) * 1000).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            }),
                            sources: activeSources
                                .filter(src => src.src !== -1) // Filter out invalid unit IDs
                                .map(src => ({
                                    id: src.src,
                                    time: new Date(src.time * 1000).toISOString(),
                                    emergency: src.emergency === 1,
                                    duration: data.call.metadata.freqList.find(freq => 
                                        Math.abs(freq.pos - src.pos) < 0.1
                                    )?.len || 0
                                }))
                                .sort((a, b) => new Date(a.time) - new Date(b.time)), // Sort by time
                            confidence: segment.avg_logprob > -0.5 ? 'Normal' : 'Low',
                            errors: totalErrors > 0 ? `${totalErrors} Errors` : null,
                            quality_metrics: {
                                error_count: totalErrors,
                                spike_count: totalSpikes,
                                compression_ratio: segment.compression_ratio,
                                avg_logprob: segment.avg_logprob,
                                no_speech_prob: segment.no_speech_prob,
                                primary_unit: activeSources.length > 0 ? 
                                    activeSources.reduce((prev, curr) => {
                                        const prevDuration = data.call.metadata.freqList.find(freq => 
                                            Math.abs(freq.pos - prev.pos) < 0.1
                                        )?.len || 0;
                                        const currDuration = data.call.metadata.freqList.find(freq => 
                                            Math.abs(freq.pos - curr.pos) < 0.1
                                        )?.len || 0;
                                        return currDuration > prevDuration ? curr : prev;
                                    }).src : null
                            },
                            word_count: segment.words.length,
                            avg_word_confidence: segment.words.reduce((sum, word) => 
                                sum + word.probability, 0) / segment.words.length
                        };
                    })
                };

                // Log transcription details
                console.log('\nTranscription Results:');
                console.log(`${transcription.call_info.talkgroup.tag}`);
                console.log(`${transcription.call_info.talkgroup.description}`);
                console.log(`Started ${new Date(transcription.call_info.timing.start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                })} · ${transcription.call_info.timing.call_length}s`);
                const endTime = new Date(transcription.call_info.timing.start_time);
                endTime.setSeconds(endTime.getSeconds() + transcription.call_info.timing.call_length);
                console.log(`Ended ${endTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                })}`);
                console.log(`${data.call.metadata.short_name} - ${(data.call.metadata.freq / 1000).toFixed(4)} MHz`);
                
                // Group segments by primary unit
                const segmentsByUnit = {};
                transcription.segments.forEach(segment => {
                    const unit = segment.quality_metrics.primary_unit;
                    if (!segmentsByUnit[unit]) segmentsByUnit[unit] = [];
                    segmentsByUnit[unit].push(segment);
                });

                // Output segments grouped by unit
                Object.entries(segmentsByUnit).forEach(([unit, segments]) => {
                    if (unit !== 'null') {
                        console.log(`\nUnit ${unit}:`);
                    }
                    segments.forEach(segment => {
                        console.log(`\n${segment.timestamp}`);
                        if (segment.errors) {
                            console.log(segment.errors);
                        }
                        if (segment.confidence === 'Low') {
                            console.log('Low Confidence');
                        }
                        console.log(segment.text);
                    });
                });

                // Save results to file
                const filename = `mqtt_transcription_${messageCount}.json`;
                fs.writeFileSync(filename, JSON.stringify(transcription, null, 2));
                console.log(`\nResults saved to ${filename}`);
            } else {
                console.error('Whisper API error:', responseText);
            }
        } else {
            console.log('No WAV data available for transcription');
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }

    // Exit after receiving MAX_MESSAGES
    if (messageCount >= MAX_MESSAGES) {
        console.log('\nReceived maximum number of messages. Exiting...');
        client.end();
        process.exit(0);
    }
});

client.on('error', (error) => {
    console.error('MQTT client error:', error);
    process.exit(1);
});
