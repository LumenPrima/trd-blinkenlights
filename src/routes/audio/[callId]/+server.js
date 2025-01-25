import { audioStore } from '$lib/server/state.svelte.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const audio = audioStore.get(params.callId);
    if (!audio?.wav) {
        return new Response(null, { status: 404 });
    }
    
    // Convert base64 to binary
    const audioData = Buffer.from(audio.wav, 'base64');
    
    return new Response(audioData, {
        headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': audioData.length.toString()
        }
    });
}
