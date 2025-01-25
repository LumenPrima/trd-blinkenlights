import { recentCalls } from '$lib/server/state.svelte.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const call = recentCalls.get(params.callId);
    if (!call?.audio?.wav) { // Check for WAV data
        return new Response(null, { status: 404 });
    }
    
    // Convert base64 to binary
    const audioData = Buffer.from(call.audio.wav, 'base64');
    
    return new Response(audioData, {
        headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': audioData.length.toString()
        }
    });
}
