// Enhanced transcription processing with improved quality metrics and error handling
function cleanAndMergeSegments(segments) {
    // Track primary units across conversation
    const conversationUnits = new Map();
    segments.forEach(segment => {
        if (segment.sources.length > 0) {
            segment.sources.forEach(source => {
                if (!conversationUnits.has(source.id)) {
                    conversationUnits.set(source.id, {
                        totalDuration: 0,
                        lastTimestamp: null
                    });
                }
                const unitInfo = conversationUnits.get(source.id);
                unitInfo.totalDuration += source.duration;
                unitInfo.lastTimestamp = source.time;
            });
        }
    });

    // First pass: Clean up text and associate units
    const cleanedSegments = segments.map(segment => {
        // Validate segment duration
        const duration = segment.end - segment.start;
        if (duration > 10 && segment.words.length < 5) {
            // Likely invalid segment - mark as low confidence
            segment.quality_metrics.error_count += 1;
            segment.quality_metrics.no_speech_prob = Math.max(
                segment.quality_metrics.no_speech_prob,
                0.75
            );
        }

        // Handle low-confidence words
        if (segment.words) {
            segment.words = segment.words.map(word => {
                if (word.probability < 0.5) {
                    // Mark low-confidence words with lighter color
                    return {
                        ...word,
                        word: word.word.trim().replace(/[\[\]]/g, ''),
                        probability: word.probability,
                        lowConfidence: true
                    };
                }
                return {
                    ...word,
                    word: word.word.trim()
                };
            });
        }

        // If segment has no sources but is close to a unit's last transmission
        if (segment.sources.length === 0) {
            const segmentTime = new Date(segment.start_time);
            let bestMatch = null;
            let shortestGap = Infinity;

            conversationUnits.forEach((info, unitId) => {
                if (info.lastTimestamp) {
                    const lastTime = new Date(info.lastTimestamp);
                    const gap = Math.abs(segmentTime - lastTime) / 1000; // gap in seconds
                    if (gap < 5 && gap < shortestGap) { // within 5 seconds
                        shortestGap = gap;
                        bestMatch = unitId;
                    }
                }
            });

            if (bestMatch) {
                segment.sources = [{
                    id: bestMatch,
                    time: segment.start_time,
                    emergency: false,
                    duration: segment.end - segment.start
                }];
                segment.quality_metrics.primary_unit = bestMatch;
            }
        }

        // Get words with their timing info
        const words = segment.words || [];
        if (words.length === 0) return segment;

        // Find repeated phrases
        const text = segment.text.trim();
        const phrases = text.split(/[,.!?]\s+/);
        const uniquePhrases = [...new Set(phrases)];

        // If there are repeated phrases, reconstruct text using only unique ones
        if (uniquePhrases.length < phrases.length) {
            // Keep only the first occurrence of each word's timing
            const uniqueWords = words.filter((word, index) => {
                const prevWords = words.slice(0, index);
                return !prevWords.some(w => w.word === word.word && Math.abs(w.start - word.start) < 0.5);
            });

            return {
                ...segment,
                text: uniquePhrases.join('. '),
                words: uniqueWords,
                word_count: uniqueWords.length,
                quality_metrics: {
                    ...segment.quality_metrics,
                    error_count: segment.quality_metrics.error_count + 1,
                    compression_ratio: calculateCompressionRatio(uniquePhrases, phrases)
                }
            };
        }

        return segment;
    });

    // Second pass: Merge similar segments that are close in time
    return cleanedSegments.reduce((acc, segment) => {
        const lastSegment = acc[acc.length - 1];
        
        if (lastSegment) {
            const timeDiff = Math.abs(segment.start - lastSegment.end);
            const textSimilarity = calculateTextSimilarity(lastSegment.text, segment.text);
            
            // Merge if segments are close in time and have similar text
            if (timeDiff < 3.0 && textSimilarity > 0.5) {
                // Combine and deduplicate sources with improved formatting
                const mergedSources = [...lastSegment.sources];
                const seenUnits = new Set(mergedSources.map(s => s.id));
                
                segment.sources.forEach(source => {
                    if (!seenUnits.has(source.id)) {
                        mergedSources.push({
                            ...source,
                            id: source.id.replace(/(\d{3})(\d{3})/, '$1-$2') // Format unit numbers
                        });
                        seenUnits.add(source.id);
                    }
                });

                // Update last segment
                lastSegment.end = segment.end;
                lastSegment.end_time = segment.end_time;
                lastSegment.sources = mergedSources.sort((a, b) => new Date(a.time) - new Date(b.time));
                lastSegment.text = cleanText(lastSegment.text + ' ' + segment.text);
                lastSegment.words = [...lastSegment.words, ...segment.words];
                lastSegment.word_count = lastSegment.words.length;
                
                // Update quality metrics
                lastSegment.quality_metrics = calculateMergedMetrics(
                    lastSegment.quality_metrics,
                    segment.quality_metrics
                );

                return acc;
            }
        }
        
        acc.push(segment);
        return acc;
    }, []);
}

// Calculate compression ratio for repeated phrases
function calculateCompressionRatio(uniquePhrases, allPhrases) {
    const uniqueLength = uniquePhrases.join(' ').length;
    const totalLength = allPhrases.join(' ').length;
    return totalLength > 0 ? uniqueLength / totalLength : 1.0;
}

// Calculate merged quality metrics
function calculateMergedMetrics(metrics1, metrics2) {
    return {
        error_count: metrics1.error_count + metrics2.error_count,
        spike_count: metrics1.spike_count + metrics2.spike_count,
        avg_logprob: (metrics1.avg_logprob + metrics2.avg_logprob) / 2,
        compression_ratio: (metrics1.compression_ratio + metrics2.compression_ratio) / 2,
        no_speech_prob: Math.max(metrics1.no_speech_prob, metrics2.no_speech_prob),
        primary_unit: metrics1.primary_unit || metrics2.primary_unit
    };
}

// Calculate similarity between two texts
function calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}

        // Enhanced text cleaning with better formatting and spacing
        function cleanText(text) {
            // First, normalize spaces and handle concatenated elements
            let spacedText = text
                .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
                .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Split letters from numbers
                .replace(/(\d)([a-zA-Z])/g, '$1 $2') // Split numbers from letters
                .replace(/([.,])(\d)/g, '$1 $2') // Space after period/comma before number
                .replace(/(\d)([.,])/g, '$1 $2') // Space before period/comma after number
                .replace(/([.!?,])([a-zA-Z\d])/g, '$1 $2') // Space after punctuation
                .replace(/\s*([.,])\s*/g, '$1 ') // Normalize spaces around periods/commas
                .replace(/([A-Za-z])\s*,\s*([A-Za-z])/g, '$1, $2') // Fix spaces around commas between words
                .replace(/\s+/g, ' '); // Normalize multiple spaces to single space

            // Split into sentences and handle each independently
            const sentences = spacedText.split(/(?<=[.!?])\s+/);
            
            // Remove duplicates while preserving order
            const seen = new Set();
            const uniqueSentences = sentences.filter(sentence => {
                // Normalize for duplicate checking
                let normalized = sentence
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, ' ');
                
                if (seen.has(normalized)) return false;
                seen.add(normalized);
                return true;
            });
            
            // Process each sentence
            return uniqueSentences
                .map(sentence => {
                    // Trim and capitalize first letter
                    sentence = sentence.trim();
                    if (sentence.length > 0) {
                        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
                    }
                    return sentence;
                })
                .join('. ')
                .trim()
                .replace(/\s+/g, ' ') // Final space normalization
                .replace(/\.\s*\./g, '.'); // Remove double periods
        }

export { cleanAndMergeSegments };
