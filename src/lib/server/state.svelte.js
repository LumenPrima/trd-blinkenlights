import { SvelteMap } from 'svelte/reactivity';
import { config } from '../config.js';
import { cleanAndMergeSegments } from './transcription.js';

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
        // Ensure we preserve both talkgroup tag fields
        const callData = {
            ...call,
            talkgroup_alpha_tag: call.talkgroup_alpha_tag,  // From the active call message
            talkgroup_tag: call.talkgroup_tag  // From the active call message
        };
        calls.set(call.id, callData);
    });
}

// Background transcription function
async function transcribeAudio(audioData, metadata, callId) {
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
        
        const response = await fetch(config.whisper.apiUrl, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = JSON.parse(await response.text());
            
            // Process segments and create enhanced transcription
            const processedSegments = result.segments.map(segment => {
                // Find the source active during this segment's time
                const segmentStartPos = segment.start;
                const segmentEndPos = segment.end;
                
                // Find all sources that overlap with this segment
                const activeSources = metadata.srcList?.filter(src => {
                    // Get the end position of this source (start of next source or end of call)
                    const nextSource = metadata.srcList.find(s => s.pos > src.pos);
                    const sourceEndPos = nextSource ? nextSource.pos : metadata.call_length;
                    
                    // Check if this source's time window overlaps with the segment
                    return (src.pos <= segmentEndPos && sourceEndPos >= segmentStartPos) && src.src !== -1;
                }) || [];
                
                const freqData = metadata.freqList?.filter(freq =>
                    freq.pos >= segment.start && freq.pos <= segment.end
                ) || [];

                const totalErrors = freqData.reduce((sum, freq) => sum + (freq.error_count || 0), 0);
                const totalSpikes = freqData.reduce((sum, freq) => sum + (freq.spike_count || 0), 0);

                const primaryUnit = activeSources.length > 0 ? 
                    activeSources.reduce((prev, curr) => {
                        const prevDuration = metadata.freqList.find(freq => 
                            Math.abs(freq.pos - prev.pos) < 0.1
                        )?.len || 0;
                        const currDuration = metadata.freqList.find(freq => 
                            Math.abs(freq.pos - curr.pos) < 0.1
                        )?.len || 0;
                        return currDuration > prevDuration ? curr : prev;
                    }).src : null;
                
                return {
                    ...segment,
                    start_time: new Date((metadata.start_time + segment.start) * 1000).toISOString(),
                    end_time: new Date((metadata.start_time + segment.end) * 1000).toISOString(),
                    sources: activeSources
                        .map(src => ({
                            id: src.src,
                            time: new Date(src.time * 1000).toISOString(),
                            emergency: src.emergency === 1,
                            duration: metadata.freqList.find(freq => 
                                Math.abs(freq.pos - src.pos) < 0.1
                            )?.len || 0
                        }))
                        .sort((a, b) => new Date(a.time) - new Date(b.time)),
                    quality_metrics: {
                        error_count: totalErrors,
                        spike_count: totalSpikes,
                        compression_ratio: segment.compression_ratio,
                        avg_logprob: segment.avg_logprob,
                        no_speech_prob: segment.no_speech_prob,
                        primary_unit: primaryUnit
                    },
                    word_count: segment.words.length,
                    avg_word_confidence: segment.words.reduce((sum, word) => 
                        sum + word.probability, 0) / segment.words.length
                };
            });

            // Update the call with transcription and raw result
            const existingCall = recentCalls.get(callId);
            if (existingCall) {
                const updatedCall = {
                    ...existingCall,
                    transcription: {
                        segments: cleanAndMergeSegments(processedSegments)
                    },
                    originalMessage: {
                        ...existingCall.originalMessage,
                        whisperResult: result
                    }
                };
                recentCalls.set(callId, updatedCall);
            }
        }
    } catch (error) {
        // Silent error handling
    }
}

export async function updateCallAudio(audioData) {
    if (!audioData?.call?.metadata) return;
    
    const metadata = audioData.call.metadata;
    const callId = `${metadata.talkgroup}-${metadata.start_time}`;
    
    // Get the active call data if it exists to get the proper talkgroup_tag
    const activeCall = calls.get(callId);
    
    // Create and store the call immediately
    const recentCall = {
        id: callId,
        talkgroup: metadata.talkgroup,
        talkgroup_tag: metadata.talkgroup_group_tag, // Audio message's group_tag corresponds to calls_active's tag
        talkgroup_alpha_tag: metadata.talkgroup_tag, // Audio message's tag corresponds to calls_active's alpha_tag
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
        audio: {
            m4a: audioData.call.audio_m4a_base64
        },
        originalMessage: audioData
    };
    
    // Add to recent calls immediately
    recentCalls.set(callId, recentCall);

    // Attempt transcription in the background if WAV data is available
    if (audioData.call.audio_wav_base64 && config.whisper?.apiUrl) {
        transcribeAudio(audioData, metadata, callId);
    }
    
    // Clean up old recent calls
    const now = Date.now();
    const callsArray = Array.from(recentCalls.entries());
    callsArray.sort(([, a], [, b]) => b.finishedAt - a.finishedAt);
    
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
