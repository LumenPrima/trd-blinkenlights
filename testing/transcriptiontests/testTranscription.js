import fs from 'fs';
import { config } from '../../../src/lib/config.js';

async function transcribeAudio(filePath) {
    try {
        // Read WAV file and convert to base64
        const fileData = fs.readFileSync(filePath);
        const base64Data = fileData.toString('base64');
        
        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const wavBlob = new Blob([binaryData], { type: 'audio/wav' });

        // Create form data
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('model', config.whisper.model);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'word');

        // Make API request
        const response = await fetch(config.whisper.apiUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Get call metadata from corresponding JSON file
        const callMetadataPath = filePath.replace('.wav', '.json');
        const callMetadata = JSON.parse(fs.readFileSync(callMetadataPath));

        // Enhance transcription with metadata
        const enhancedTranscription = {
            // Call metadata
            call_info: {
                talkgroup: {
                    id: callMetadata.talkgroup,
                    tag: callMetadata.talkgroup_tag,
                    description: callMetadata.talkgroup_description,
                    group: callMetadata.talkgroup_group
                },
                timing: {
                    start_time: new Date(callMetadata.start_time * 1000).toISOString(),
                    duration: result.duration,
                    call_length: callMetadata.call_length
                },
                emergency: callMetadata.emergency === 1,
                priority: callMetadata.priority === 1
            },
            
            // Enhanced transcription segments
            segments: result.segments.map(segment => {
                // Find sources active during this segment
                const activeSources = callMetadata.srcList.filter(src => 
                    src.pos >= segment.start && src.pos <= segment.end
                );
                
                // Find frequency data during this segment
                const freqData = callMetadata.freqList.filter(freq =>
                    freq.pos >= segment.start && freq.pos <= segment.end
                );

                // Calculate segment quality metrics
                const totalErrors = freqData.reduce((sum, freq) => sum + freq.error_count, 0);
                const totalSpikes = freqData.reduce((sum, freq) => sum + freq.spike_count, 0);
                
                return {
                    ...segment,
                    start_time: new Date((callMetadata.start_time + segment.start) * 1000).toISOString(),
                    end_time: new Date((callMetadata.start_time + segment.end) * 1000).toISOString(),
                    sources: activeSources
                        .filter(src => src.src !== -1) // Filter out invalid unit IDs
                        .map(src => ({
                            id: src.src,
                            time: new Date(src.time * 1000).toISOString(),
                            emergency: src.emergency === 1,
                            duration: callMetadata.freqList.find(freq => 
                                Math.abs(freq.pos - src.pos) < 0.1
                            )?.len || 0
                        }))
                        .sort((a, b) => new Date(a.time) - new Date(b.time)), // Sort by time
                    quality_metrics: {
                        error_count: totalErrors,
                        spike_count: totalSpikes,
                        compression_ratio: segment.compression_ratio,
                        avg_logprob: segment.avg_logprob,
                        no_speech_prob: segment.no_speech_prob,
                        primary_unit: activeSources.length > 0 ? 
                            activeSources.reduce((prev, curr) => {
                                const prevDuration = callMetadata.freqList.find(freq => 
                                    Math.abs(freq.pos - prev.pos) < 0.1
                                )?.len || 0;
                                const currDuration = callMetadata.freqList.find(freq => 
                                    Math.abs(freq.pos - curr.pos) < 0.1
                                )?.len || 0;
                                return currDuration > prevDuration ? curr : prev;
                            }).src : null
                    },
                    word_count: segment.words.length,
                    avg_word_confidence: segment.words.reduce((sum, word) => 
                        sum + word.probability, 0) / segment.words.length
                }
            })
        };

        // Output enhanced results
        console.log('Enhanced Transcription Results:');
        console.log(`${enhancedTranscription.call_info.talkgroup.tag}`);
        console.log(`${enhancedTranscription.call_info.talkgroup.description}`);
        console.log(`Started ${new Date(enhancedTranscription.call_info.timing.start_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })} · ${enhancedTranscription.call_info.timing.call_length}s`);

        // Group segments by primary unit
        const segmentsByUnit = enhancedTranscription.segments.reduce((acc, segment) => {
            const unit = segment.quality_metrics.primary_unit;
            if (!acc[unit]) acc[unit] = [];
            acc[unit].push(segment);
            return acc;
        }, {});

        // Output segments grouped by unit
        Object.entries(segmentsByUnit).forEach(([unit, segments]) => {
            if (unit !== 'null') {
                console.log(`\nUnit ${unit}:`);
            }
            segments.forEach(segment => {
                console.log(`\n${new Date(segment.start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                })}`);
                if (segment.quality_metrics.error_count > 0) {
                    console.log(`${segment.quality_metrics.error_count} Errors`);
                }
                if (segment.avg_word_confidence < 0.7) {
                    console.log('Low Confidence');
                }
                console.log(segment.text);
            });
        });
        
        // Save enhanced results
        fs.writeFileSync('transcription_results.json', JSON.stringify(enhancedTranscription, null, 2));
        console.log('Enhanced results saved to transcription_results.json');
        
    } catch (error) {
        console.error('Transcription failed:', error.message);
        process.exit(1);
    }
}

// Get file path from command line
const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node testTranscription.js <path_to_wav_file>');
    process.exit(1);
}

// Run transcription
transcribeAudio(filePath);
