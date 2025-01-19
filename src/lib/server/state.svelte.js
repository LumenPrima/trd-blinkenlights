import { SvelteMap } from 'svelte/reactivity';
import { config } from '../config.js';

// System state
export const systems = $state([]);

export function updateSystems(data) {
    if (!data) return;
    
    // Clear and update systems array
    systems.length = 0;
    systems.push(...data);
}

export const rates = $state([]);
export const calls = $state(new SvelteMap()); // Active calls only
export const recentCalls = $state(new SvelteMap()); // Calls with audio
export const recorders = $state(new SvelteMap());

// Keep track of rate history for graphs
export const rateHistory = $state(new SvelteMap());

// Update functions
export function updateRates(data) {
    if (!data) return;
    
    // Clear and update rates array
    rates.length = 0;
    rates.push(...data);
    
    // Update history for each system
    data.forEach(rate => {
        const history = rateHistory.get(rate.sys_name) || [];
        history.push({
            time: new Date(),
            rate: rate.decoderate,
            control: rate.control_channel
        });
        
        // Maintain fixed size
        if (history.length > config.system.maxRateHistory) {
            history.shift();
        }
        
        rateHistory.set(rate.sys_name, history);
    });
}

export function updateCalls(callsData) {
    if (!callsData) {
        calls.clear();
        return;
    }
    
    // Update active calls Map
    const activeCallIds = new Set(callsData.map(call => call.id));
    
    // Remove calls that are no longer active
    calls.forEach((_, id) => {
        if (!activeCallIds.has(id)) {
            calls.delete(id);
        }
    });
    
    // Add or update active calls
    callsData.forEach(call => {
        calls.set(call.id, call);
    });
}

export async function updateCallAudio(audioData) {
    if (!audioData?.call?.metadata) return;
    
    const metadata = audioData.call.metadata;
    const callId = `${metadata.talkgroup}-${metadata.start_time}`;
    
    // Send WAV to transcription API
    let transcription = null;
    if (audioData.call.audio_wav_base64) {
        try {
            // Convert base64 to binary
            const binaryData = Uint8Array.from(atob(audioData.call.audio_wav_base64), c => c.charCodeAt(0));
            const wavBlob = new Blob([binaryData], { type: 'audio/wav' });

            // Create form data
            const formData = new FormData();
            formData.append('file', wavBlob, 'audio.wav');
            formData.append('model', config.whisper.model);
            formData.append('response_format', 'verbose_json');
            formData.append('timestamp_granularities[]', 'word');
            
            console.log('Transcribing audio...');
            const response = await fetch(config.whisper.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            console.log('Transcription response status:', response.status);
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            if (response.ok) {
                try {
                    const result = JSON.parse(responseText);
                    
                    // Create enhanced transcription with metadata
                    transcription = {
                        segments: result.segments.map(segment => {
                            // Find sources active during this segment
                            const activeSources = metadata.srcList?.filter(src => 
                                src.pos >= segment.start && src.pos <= segment.end
                            ) || [];
                            
                            // Find frequency data during this segment
                            const freqData = metadata.freqList?.filter(freq =>
                                freq.pos >= segment.start && freq.pos <= segment.end
                            ) || [];

                            // Calculate segment quality metrics
                            const totalErrors = freqData.reduce((sum, freq) => sum + (freq.error_count || 0), 0);
                            const totalSpikes = freqData.reduce((sum, freq) => sum + (freq.spike_count || 0), 0);
                            
                            return {
                                ...segment,
                                start_time: new Date((metadata.start_time + segment.start) * 1000).toISOString(),
                                end_time: new Date((metadata.start_time + segment.end) * 1000).toISOString(),
                                sources: activeSources.map(src => ({
                                    id: src.src,
                                    time: new Date(src.time * 1000).toISOString(),
                                    emergency: src.emergency === 1
                                })),
                                quality_metrics: {
                                    error_count: totalErrors,
                                    spike_count: totalSpikes,
                                    compression_ratio: segment.compression_ratio,
                                    avg_logprob: segment.avg_logprob,
                                    no_speech_prob: segment.no_speech_prob
                                },
                                word_count: segment.words.length,
                                avg_word_confidence: segment.words.reduce((sum, word) => 
                                    sum + word.probability, 0) / segment.words.length
                            };
                        })
                    };
                    console.log('Enhanced transcription:', transcription);
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                }
            }
        } catch (error) {
            console.error('Transcription failed:', error);
        }
    } else {
        console.log('No WAV data available for transcription');
    }
    
    // Create the recent call entry with metadata and audio (excluding WAV)
    const recentCall = {
        id: callId,
        talkgroup: metadata.talkgroup,
        talkgroup_tag: metadata.talkgroup_tag,
        talkgroup_description: metadata.talkgroup_description,
        talkgroup_group: metadata.talkgroup_group,
        talkgroup_group_tag: metadata.talkgroup_group_tag,
        start_time: metadata.start_time,
        stop_time: metadata.stop_time,
        elapsed: metadata.call_length,
        emergency: metadata.emergency === 1,
        encrypted: metadata.encrypted === 1,
        freq: metadata.freq,
        sys_name: metadata.short_name,
        finishedAt: Date.now(),
        transcription,
        audio: {
            m4a: audioData.call.audio_m4a_base64
        }
    };
    
    // Add to recent calls
    recentCalls.set(callId, recentCall);
    
    // Clean up old recent calls
    const now = Date.now();
    
    // Convert to array for sorting
    const callsArray = Array.from(recentCalls.entries());
    
    // Sort by finishedAt timestamp, newest first
    callsArray.sort(([, a], [, b]) => b.finishedAt - a.finishedAt);
    
    // Keep only the newest MAX_RECENT_CALLS that aren't too old
    recentCalls.clear();
    callsArray.forEach(([id, call], index) => {
        if (index < config.system.maxRecentCalls && (now - call.finishedAt) <= config.system.callCleanupInterval) {
            recentCalls.set(id, call);
        }
    });
}

export function updateRecorders(recordersData) {
    if (!recordersData) return;
    
    recordersData.forEach(recorder => {
        const existingRecorder = recorders.get(recorder.id);
        
        // If state changed, update timestamp
        if (existingRecorder && existingRecorder.rec_state_type !== recorder.rec_state_type) {
            recorder.last_state_change = Date.now();
        } else if (!existingRecorder) {
            // New recorder - set initial timestamp
            recorder.last_state_change = Date.now();
        } else {
            // Preserve existing timestamp
            recorder.last_state_change = existingRecorder.last_state_change;
        }
        
        recorders.set(recorder.id, recorder);
    });
}
