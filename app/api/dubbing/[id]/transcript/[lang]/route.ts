import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Parse SRT format into segments with speaker detection
function parseSRT(srtContent: string): { segments: any[] } {
  const segments: any[] = [];
  
  // Split by double newline to get individual subtitle blocks
  const blocks = srtContent.trim().split(/\n\n+/);
  
  let lastEndTime = 0;
  let currentSpeaker = 1;
  
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
    
    // Simple speaker detection heuristic:
    // If there's a gap > 0.5 seconds between segments, might be a new speaker
    // Also check if the text contains speaker indicators
    const gap = startTime - lastEndTime;
    
    // Check for explicit speaker markers in text
    const speakerMatch = text.match(/^(?:\[?(Speaker\s*(\d+)|S(\d+))\]?:?\s*)?(.+)$/i);
    
    if (speakerMatch && (speakerMatch[2] || speakerMatch[3])) {
      // Explicit speaker marker found
      currentSpeaker = parseInt(speakerMatch[2] || speakerMatch[3], 10);
    } else if (gap > 1.0 && segments.length > 0) {
      // Significant gap - toggle between speaker 1 and 2
      currentSpeaker = currentSpeaker === 1 ? 2 : 1;
    }
    
    const cleanText = speakerMatch?.[4] || text;
    
    segments.push({
      start: startTime,
      end: endTime,
      text: cleanText,
      speaker_id: `speaker_${currentSpeaker}`,
    });
    
    lastEndTime = endTime;
  }
  
  // If we only detected speaker 1, try to distribute based on content patterns
  const uniqueSpeakers = new Set(segments.map(s => s.speaker_id));
  if (uniqueSpeakers.size === 1 && segments.length > 2) {
    // Simple alternating pattern for dialogue
    let toggle = false;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const nextSeg = segments[i + 1];
      
      // Short utterances followed by responses suggest dialogue
      if (seg.text.length < 50 && nextSeg) {
        const gap = nextSeg.start - seg.end;
        if (gap > 0.3) {
          toggle = !toggle;
        }
      }
      
      // Assign alternating speakers based on pattern
      if (i > 0) {
        const prevSeg = segments[i - 1];
        const gap = seg.start - prevSeg.end;
        if (gap > 0.5) {
          segments[i].speaker_id = prevSeg.speaker_id === 'speaker_1' ? 'speaker_2' : 'speaker_1';
        } else {
          segments[i].speaker_id = prevSeg.speaker_id;
        }
      }
    }
  }
  
  return { segments };
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
    
    // Parse the SRT format into segments with speaker detection
    const parsed = parseSRT(srtContent);
    console.log(`Parsed ${parsed.segments.length} segments`);
    
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
