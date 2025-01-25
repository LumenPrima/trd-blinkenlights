function cleanAndMergeSegments(segments) {
    return segments.map(segment => ({
        ...segment,
        words: segment.words?.map(word => ({
            ...word,
            word: word.word.trim(),
            lowConfidence: word.probability < 0.5
        })) || [],
        text: segment.words?.map(w => w.word.trim()).join(' ') || ''
    }));
}

export { cleanAndMergeSegments };
