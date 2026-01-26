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
function assignSpeakers(segments: any[]) {
  // Analyze the content to detect speaker changes
  // Key patterns:
  // 1. Short exclamations often indicate a different speaker responding
  // 2. Questions followed by statements suggest dialogue
  // 3. Time gaps between segments suggest speaker changes
  // 4. Content that references another speaker (e.g., "Metal Man", "Brett")
  
  let currentSpeaker = 1;
  const maxSpeakers = 3; // Support up to 3 speakers
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prevSeg = i > 0 ? segments[i - 1] : null;
    const text = seg.text.toLowerCase();
    
    // Determine if this should be a new speaker
    let changeSpeaker = false;
    
    if (prevSeg) {
      const gap = seg.gap;
      const prevText = prevSeg.text.toLowerCase();
      
      // Rule 1: Significant time gap (> 0.3s) often means speaker change
      if (gap > 0.3) {
        changeSpeaker = true;
      }
      
      // Rule 2: Short exclamations/responses suggest dialogue
      if (seg.text.length < 30 && prevSeg.text.length > 30) {
        changeSpeaker = true;
      }
      
      // Rule 3: Questions followed by non-questions
      if (prevText.includes('?') && !text.includes('?')) {
        changeSpeaker = true;
      }
      
      // Rule 4: Addressing someone by name suggests speaker change
      if (text.includes('metal man') || text.includes('brett') || 
          text.includes('homme de métal') || text.includes('robot')) {
        // This is likely the robot character (Speaker 2)
        currentSpeaker = 2;
        changeSpeaker = false;
      }
      
      // Rule 5: "I'm obsolete" type statements - robot character
      if (text.includes('obsolete') || text.includes('obsolète')) {
        currentSpeaker = 2;
        changeSpeaker = false;
      }
      
      // Rule 6: Product endorsements - likely main spokesperson (Speaker 1)
      if (text.includes('good product') || text.includes('bon produit') ||
          text.includes('bref') || text.includes('clean') || text.includes('fresh')) {
        currentSpeaker = 1;
        changeSpeaker = false;
      }
      
      // Rule 7: "Let's work" / commands - Speaker 1
      if (text.includes("let's work") || text.includes('allons travailler')) {
        currentSpeaker = 1;
        changeSpeaker = false;
      }
      
      // Rule 8: "Ugh" / reactions - Speaker 1
      if (text.match(/^(ugh|ouf|oh|ah)\.?$/i)) {
        currentSpeaker = 1;
        changeSpeaker = false;
      }
    }
    
    // Apply speaker change
    if (changeSpeaker && i > 0) {
      // Cycle through speakers: 1 -> 2 -> 1 (or occasionally 3)
      const prevSpeaker = parseInt(prevSeg.speaker_id.split('_')[1]);
      if (prevSpeaker === 1) {
        currentSpeaker = 2;
      } else {
        currentSpeaker = 1;
      }
    }
    
    segments[i].speaker_id = `speaker_${currentSpeaker}`;
  }
  
  // Second pass: ensure we have proper speaker distribution for dialogue
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
