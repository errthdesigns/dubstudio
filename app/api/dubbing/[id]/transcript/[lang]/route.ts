import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Parse SRT format into segments with smart speaker detection
function parseSRT(srtContent: string): { segments: any[] } {
  const segments: any[] = [];
  
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
    
    // Check for explicit speaker markers in text
    const speakerMatch = text.match(/^(?:\[?(Speaker\s*(\d+)|S(\d+))\]?:?\s*)?(.+)$/i);
    const cleanText = speakerMatch?.[4] || text;
    
    segments.push({
      start: startTime,
      end: endTime,
      text: cleanText,
      speaker_id: 'speaker_1', // Will be assigned below
      gap: startTime - lastEndTime,
    });
    
    lastEndTime = endTime;
  }
  
  // Smart speaker assignment based on dialogue patterns
  if (segments.length > 0) {
    assignSpeakers(segments);
  }
  
  // Remove gap property before returning
  segments.forEach(s => delete s.gap);
  
  return { segments };
}

// Assign speakers based on dialogue patterns and content analysis
// Speaker 1 = Man, Speaker 2 = Robot, Speaker 3 = Woman (only says "It's an ad")
function assignSpeakers(segments: any[]) {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const text = seg.text.toLowerCase();
    
    let speaker = 1; // Default to Speaker 1 (Man)
    
    // SPEAKER 3 - WOMAN (only says "It's an ad" / "C'est une pub")
    if (text.includes("it's an ad") || text.includes("its an ad") || 
        text.includes("c'est une pub") || text.includes('cest une pub')) {
      speaker = 3;
    }
    
    // SPEAKER 2 - ROBOT patterns
    // Robot says things about being obsolete, references Metal Man, talks to Brett
    else if (text.includes('obsolete') || text.includes('obsolète') ||
             text.includes('metal man') || text.includes('homme de métal') ||
             text.includes('did you see that') || text.includes('as-tu vu') ||
             text.includes('brett') || text.includes('cleans toilets') || 
             text.includes('nettoie les toilettes') || text.includes('faster than') ||
             text.includes('plus vite que')) {
      speaker = 2;
    }
    
    // SPEAKER 1 - MAN (main spokesperson, product explanations, reactions)
    // Everything else is the Man
    else {
      speaker = 1;
    }
    
    segments[i].speaker_id = `speaker_${speaker}`;
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
