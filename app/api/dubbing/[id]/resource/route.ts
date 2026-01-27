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
        'Accept': 'application/json',
      },
    });

    console.log(`Resource response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resource API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to get dubbing resource', status: response.status, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log the FULL structure we get back for debugging
    console.log('=== FULL RESOURCE DATA ===');
    console.log(JSON.stringify(data, null, 2).substring(0, 3000));
    console.log('Resource data keys:', Object.keys(data));
    
    // Extract speakers and their segments
    const speakers: any[] = [];
    const segments: any[] = [];
    
    // Try multiple possible data structures that ElevenLabs might use
    
    // Structure 1: speaker_segments
    if (data.speaker_segments) {
      console.log('Found speaker_segments:', Object.keys(data.speaker_segments));
      for (const [speakerId, speakerData] of Object.entries(data.speaker_segments as Record<string, any>)) {
        console.log(`Speaker ${speakerId}:`, JSON.stringify(speakerData).substring(0, 500));
        
        speakers.push({
          id: speakerId,
          name: speakerData.name || speakerData.speaker_name || `Speaker ${speakers.length + 1}`,
          voice_id: speakerData.voice_id,
        });
        
        if (speakerData.segments) {
          for (const seg of speakerData.segments) {
            segments.push({
              id: seg.id || `seg_${segments.length}`,
              speaker_id: speakerId,
              start: seg.start_time || seg.start || seg.start_ms / 1000,
              end: seg.end_time || seg.end || seg.end_ms / 1000,
              text: seg.text || seg.transcription || seg.original_text,
              translated_text: seg.translated_text || seg.translation || seg.dubbed_text,
            });
          }
        }
      }
    }
    
    // Structure 2: speakers array with segments
    if (data.speakers && Array.isArray(data.speakers)) {
      console.log('Found speakers array:', data.speakers.length);
      for (const speaker of data.speakers) {
        console.log(`Speaker:`, JSON.stringify(speaker).substring(0, 500));
        
        const speakerId = speaker.id || speaker.speaker_id || `speaker_${speakers.length}`;
        speakers.push({
          id: speakerId,
          name: speaker.name || speaker.label || `Speaker ${speakers.length + 1}`,
          voice_id: speaker.voice_id,
        });
        
        if (speaker.segments) {
          for (const seg of speaker.segments) {
            segments.push({
              id: seg.id || `seg_${segments.length}`,
              speaker_id: speakerId,
              start: seg.start_time || seg.start || (seg.start_ms ? seg.start_ms / 1000 : 0),
              end: seg.end_time || seg.end || (seg.end_ms ? seg.end_ms / 1000 : 0),
              text: seg.text || seg.transcription,
              translated_text: seg.translated_text || seg.translation,
            });
          }
        }
      }
    }
    
    // Structure 3: segments array with speaker_id
    if (data.segments && Array.isArray(data.segments)) {
      console.log('Found segments array:', data.segments.length);
      for (const seg of data.segments) {
        const speakerId = seg.speaker_id || seg.speaker || 'speaker_1';
        
        if (!speakers.find(s => s.id === speakerId)) {
          speakers.push({
            id: speakerId,
            name: `Speaker ${speakers.length + 1}`,
          });
        }
        
        segments.push({
          id: seg.id || `seg_${segments.length}`,
          speaker_id: speakerId,
          start: seg.start_time || seg.start || (seg.start_ms ? seg.start_ms / 1000 : 0),
          end: seg.end_time || seg.end || (seg.end_ms ? seg.end_ms / 1000 : 0),
          text: seg.text || seg.transcription,
          translated_text: seg.translated_text || seg.translation,
        });
      }
    }
    
    // Structure 4: tracks with segments
    if (data.tracks && Array.isArray(data.tracks)) {
      console.log('Found tracks array:', data.tracks.length);
      for (const track of data.tracks) {
        if (track.type === 'voice' || track.type === 'speaker') {
          const speakerId = track.id || track.speaker_id || `speaker_${speakers.length}`;
          speakers.push({
            id: speakerId,
            name: track.name || track.label || `Speaker ${speakers.length + 1}`,
            voice_id: track.voice_id,
          });
          
          if (track.segments) {
            for (const seg of track.segments) {
              segments.push({
                id: seg.id || `seg_${segments.length}`,
                speaker_id: speakerId,
                start: seg.start || seg.start_time || 0,
                end: seg.end || seg.end_time || 0,
                text: seg.text || seg.transcription,
                translated_text: seg.translated_text || seg.translation,
              });
            }
          }
        }
      }
    }
    
    // Sort segments by start time
    segments.sort((a, b) => (a.start || 0) - (b.start || 0));
    
    console.log(`=== EXTRACTION RESULT ===`);
    console.log(`Extracted ${speakers.length} speakers and ${segments.length} segments`);
    if (speakers.length > 0) {
      console.log('Speakers:', speakers.map(s => s.id).join(', '));
    }
    
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
