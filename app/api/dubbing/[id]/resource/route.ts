import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Get dubbing resource with speaker tracks and segments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`Fetching dubbing resource for ${id}`);

    const response = await fetch(`${ELEVENLABS_API_URL}/dubbing/resource/${id}`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    console.log(`Resource response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resource API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get dubbing resource' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log the structure we get back
    console.log('Resource data keys:', Object.keys(data));
    console.log('Speaker tracks:', data.speaker_tracks ? Object.keys(data.speaker_tracks) : 'none');
    console.log('Speaker segments:', data.speaker_segments ? Object.keys(data.speaker_segments) : 'none');
    
    // Extract speakers and their segments
    const speakers: any[] = [];
    const segments: any[] = [];
    
    // Process speaker_segments to get detailed segment info
    if (data.speaker_segments) {
      for (const [speakerId, speakerData] of Object.entries(data.speaker_segments as Record<string, any>)) {
        console.log(`Processing speaker: ${speakerId}`, speakerData);
        
        speakers.push({
          id: speakerId,
          name: speakerData.name || `Speaker ${speakers.length + 1}`,
          voice_id: speakerData.voice_id,
        });
        
        // Each speaker may have segments
        if (speakerData.segments) {
          for (const seg of speakerData.segments) {
            segments.push({
              id: seg.id || `seg_${segments.length}`,
              speaker_id: speakerId,
              start: seg.start_time || seg.start,
              end: seg.end_time || seg.end,
              text: seg.text || seg.transcription,
              translated_text: seg.translated_text || seg.translation,
            });
          }
        }
      }
    }
    
    // Sort segments by start time
    segments.sort((a, b) => (a.start || 0) - (b.start || 0));
    
    console.log(`Extracted ${speakers.length} speakers and ${segments.length} segments`);
    
    return NextResponse.json({
      ...data,
      extracted_speakers: speakers,
      extracted_segments: segments,
    });
  } catch (error) {
    console.error('Get resource error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
