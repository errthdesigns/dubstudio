import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Parse SRT format into segments with smart speaker detection
function parseSRT(srtContent: string): { segments: any[] } {
  const segments: any[] = [];
  
  // Log raw SRT for debugging
  console.log('Raw SRT preview:', srtContent.substring(0, 500));
  
  // Split by double newline to get individual subtitle blocks
  const blocks = srtContent.trim().split(/\n\n+/);
  
  let lastEndTime = 0;
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    
    // Line 1: Subtitle number
    // Line 2: Timestamps (00:00:00,000 --> 00:00:02,500)
    // Line 3+: Text content
    
    const timestampLine = lines[1];
    const timestampMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    
    if (!timestampMatch) continue;
    
    const startTime = parseTimestamp(timestampMatch[1]);
    const endTime = parseTimestamp(timestampMatch[2]);
    const text = lines.slice(2).join(' ').trim();
    
    // Check for various speaker marker formats in the text
    // Format 1: [Speaker 1]: text or Speaker 1: text
    // Format 2: speaker_0, speaker_1, etc.
    // Format 3: S1:, S2:, etc.
    let speakerId = null;
    let cleanText = text;
    
    // Check for speaker markers at start of text
    const speakerPatterns = [
      /^\[?(?:speaker[_\s]*(\d+))\]?[:\s]+(.+)$/i,  // speaker_1: or [speaker 1]: 
      /^\[?S(\d+)\]?[:\s]+(.+)$/i,                   // S1: or [S1]:
      /^(?:Person|Voice|Speaker)\s*(\d+)[:\s]+(.+)$/i, // Person 1: Voice 2:
    ];
    
    for (const pattern of speakerPatterns) {
      const match = text.match(pattern);
      if (match) {
        speakerId = `speaker_${match[1]}`;
        cleanText = match[2].trim();
        break;
      }
    }
    
    segments.push({
      start: startTime,
      end: endTime,
      text: cleanText,
      speaker_id: speakerId, // null if not found, will be assigned below
      gap: startTime - lastEndTime,
    });
    
    lastEndTime = endTime;
  }
  
  // Assign speakers based on timing patterns if no markers found
  assignSpeakersFromTiming(segments);
  
  // Remove gap property before returning
  segments.forEach(s => delete s.gap);
  
  return { segments };
}

// Assign speakers based on timing and dialogue patterns
// Uses conservative heuristics - Speaker 1 is default (main speaker)
function assignSpeakersFromTiming(segments: any[]) {
  // First check if any segments already have speaker IDs from markers
  const hasExistingSpeakers = segments.some(s => s.speaker_id !== null);
  
  if (hasExistingSpeakers) {
    // Fill in gaps for segments without speaker IDs
    let lastSpeaker = 'speaker_1';
    for (const seg of segments) {
      if (seg.speaker_id) {
        lastSpeaker = seg.speaker_id;
      } else {
        seg.speaker_id = lastSpeaker;
      }
    }
    console.log('Using speaker markers from SRT');
  } else {
    // No markers found - use conservative detection
    // Default: Speaker 1 is the main speaker, only switch on STRONG evidence
    console.log('No speaker markers found - using conservative detection');
    console.log('Segment gaps:', segments.map(s => s.gap?.toFixed(2)).join(', '));
    
    // Calculate average gap to find significant pauses
    const gaps = segments.map(s => s.gap || 0).filter(g => g > 0);
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const maxGap = Math.max(...gaps, 0);
    console.log(`Average gap: ${avgGap.toFixed(2)}s, Max gap: ${maxGap.toFixed(2)}s`);
    
    let currentSpeaker = 1;
    const speakerChanges: number[] = [0];
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const gap = seg.gap || 0;
      const prevSeg = i > 0 ? segments[i - 1] : null;
      
      let shouldSwitch = false;
      
      // Only switch on SIGNIFICANT gaps (> 0.5s AND above average)
      // This is more conservative - main speaker stays Speaker 1
      if (i > 0 && gap > 0.5 && gap > avgGap * 1.5) {
        shouldSwitch = true;
        console.log(`Segment ${i}: significant gap ${gap.toFixed(2)}s triggers switch`);
      }
      
      // Also switch on question-response pattern with gap
      if (prevSeg && !shouldSwitch && gap > 0.2) {
        const prevText = prevSeg.text || '';
        if (prevText.endsWith('?')) {
          shouldSwitch = true;
          console.log(`Segment ${i}: question with gap triggers switch`);
        }
      }
      
      if (i > 0 && shouldSwitch) {
        currentSpeaker = currentSpeaker === 1 ? 2 : 1;
        speakerChanges.push(i);
      }
      
      seg.speaker_id = `speaker_${currentSpeaker}`;
    }
    
    console.log(`Detected speaker changes at segments: ${speakerChanges.join(', ')}`);
  }
  
  // Log speaker distribution
  const speakerCounts: Record<string, number> = {};
  segments.forEach(s => {
    speakerCounts[s.speaker_id] = (speakerCounts[s.speaker_id] || 0) + 1;
  });
  
  console.log('Speaker distribution:', speakerCounts);
}

// Convert timestamp string to seconds
function parseTimestamp(timestamp: string): number {
  // Format: 00:00:00,000 or 00:00:00.000
  const parts = timestamp.replace(',', '.').split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lang: string }> }
) {
  try {
    const { id, lang } = await params;

    console.log(`Fetching transcript for dubbing ${id}, language ${lang}`);

    // ElevenLabs returns SRT format by default
    const response = await fetch(
      `${ELEVENLABS_API_URL}/dubbing/${id}/transcript/${lang}?format_type=srt`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    console.log(`Transcript response status: ${response.status}`);

    if (!response.ok) {
      // If 404 or 425 (not ready), return empty segments
      if (response.status === 404 || response.status === 425) {
        console.log(`Transcript not available (${response.status}), returning empty`);
        return NextResponse.json({ segments: [] });
      }
      
      const errorText = await response.text();
      console.error('Transcript API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get transcript', segments: [] },
        { status: response.status }
      );
    }

    // Get the SRT content as text
    const srtContent = await response.text();
    console.log('SRT content length:', srtContent.length);
    console.log('SRT content preview:', srtContent.substring(0, 500));
    
    // Parse the SRT format into segments with speaker detection
    const parsed = parseSRT(srtContent);
    console.log(`Parsed ${parsed.segments.length} segments for language: ${lang}`);
    
    // Log first segment to verify content
    if (parsed.segments.length > 0) {
      console.log(`First segment text (${lang}):`, parsed.segments[0].text);
    }
    
    // Log speaker distribution
    const speakers = new Set(parsed.segments.map(s => s.speaker_id));
    console.log(`Detected ${speakers.size} unique speakers:`, Array.from(speakers));
    
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Get transcript error:', error);
    return NextResponse.json(
      { error: 'Internal server error', segments: [] },
      { status: 500 }
    );
  }
}
