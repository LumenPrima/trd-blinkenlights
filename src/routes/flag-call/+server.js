import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { processTranscriptionSegments } from '$lib/utils/transcription.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const call = await request.json();
        
        // Create a directory for flagged calls if it doesn't exist
        const flaggedDir = path.join(process.cwd(), 'flagged-calls');
        if (!fs.existsSync(flaggedDir)) {
            fs.mkdirSync(flaggedDir);
        }

        // Get base filename from original recording (without extension)
        const baseFilename = call.originalMessage?.call?.metadata?.filename?.replace('.wav', '') || `${call.talkgroup}-${call.start_time}`;
        
        // Create directory using the base filename
        const callDir = path.join(flaggedDir, baseFilename);
        if (!fs.existsSync(callDir)) {
            fs.mkdirSync(callDir);
        }

        // Process segments and extract only display-relevant data
        const processedSegments = processTranscriptionSegments(call.transcription);
        const displayedSegments = processedSegments.map(segment => ({
            text: segment.text,
            unit: segment.sources?.[0]?.id,
            showUnit: segment.showUnit,
            hasError: segment.hasError,
            lowConfidence: segment.lowConfidence
        }));

        // Clean original message (remove audio data)
        const originalMessage = call.originalMessage ? (() => {
            const cleaned = JSON.parse(JSON.stringify(call.originalMessage));
            if (cleaned.call) {
                delete cleaned.call.audio_wav_base64;
                delete cleaned.call.audio_m4a_base64;
            }
            return cleaned;
        })() : null;

        // Save consolidated data
        const consolidatedData = {
            // Original MQTT message (includes raw whisper result)
            originalMessage,

            // Enhanced transcription with metadata
            transcription: call.transcription,

            // Final displayed format
            displayedText: displayedSegments
        };

        fs.writeFileSync(
            path.join(callDir, `${baseFilename}.json`),
            JSON.stringify(consolidatedData, null, 2)
        );

        // Save audio if available
        if (call.audio?.m4a) {
            const audioData = Buffer.from(call.audio.m4a, 'base64');
            fs.writeFileSync(path.join(callDir, `${baseFilename}.m4a`), audioData);
        }

        return json({ success: true, path: callDir });
    } catch (error) {
        console.error('Error flagging call:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
}
