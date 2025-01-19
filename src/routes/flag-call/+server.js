import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const call = await request.json();
        
        // Create a directory for flagged calls if it doesn't exist
        const flaggedDir = path.join(process.cwd(), 'flagged-calls');
        if (!fs.existsSync(flaggedDir)) {
            fs.mkdirSync(flaggedDir);
        }

        // Create a directory for this call using talkgroup and timestamp
        const callDir = path.join(flaggedDir, `${call.talkgroup}-${call.start_time}`);
        if (!fs.existsSync(callDir)) {
            fs.mkdirSync(callDir);
        }

        // Save metadata and transcription
        fs.writeFileSync(
            path.join(callDir, 'metadata.json'),
            JSON.stringify({
                talkgroup: call.talkgroup,
                talkgroup_tag: call.talkgroup_tag,
                talkgroup_description: call.talkgroup_description,
                talkgroup_group: call.talkgroup_group,
                talkgroup_group_tag: call.talkgroup_group_tag,
                start_time: call.start_time,
                stop_time: call.stop_time,
                elapsed: call.elapsed,
                emergency: call.emergency,
                encrypted: call.encrypted,
                freq: call.freq,
                sys_name: call.sys_name,
                finishedAt: call.finishedAt
            }, null, 2)
        );

        // Save transcription if available
        if (call.transcription) {
            fs.writeFileSync(
                path.join(callDir, 'transcription.json'),
                JSON.stringify(call.transcription, null, 2)
            );
        }

        // Save audio if available
        if (call.audio?.m4a) {
            const audioData = Buffer.from(call.audio.m4a, 'base64');
            fs.writeFileSync(path.join(callDir, 'audio.m4a'), audioData);
        }

        // Save original MQTT audio message if available
        if (call.originalMessage) {
            fs.writeFileSync(
                path.join(callDir, 'original-message.json'),
                JSON.stringify(call.originalMessage, null, 2)
            );
        }

        return json({ success: true, path: callDir });
    } catch (error) {
        console.error('Error flagging call:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
}
