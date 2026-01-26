import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Get speakers and their voice info for a dubbing project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('lang') || 'fr';

    console.log(`Fetching speakers for dubbing ${id}, language ${languageCode}`);

    // Get the dubbing project details
    const projectResponse = await fetch(`${ELEVENLABS_API_URL}/dubbing/${id}`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!projectResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get dubbing project' },
        { status: projectResponse.status }
      );
    }

    const projectData = await projectResponse.json();
    console.log('Dubbing project:', projectData);

    // Try to get similar voices for the project (if available)
    const speakers = [];
    
    // ElevenLabs auto-detects speakers and assigns voices
    // We'll create speaker entries based on the project info
    const numSpeakers = projectData.num_speakers || 2;
    
    for (let i = 1; i <= numSpeakers; i++) {
      // Try to get similar voices for this speaker
      let similarVoices: any[] = [];
      try {
        const similarResponse = await fetch(
          `${ELEVENLABS_API_URL}/dubbing/${id}/resource/${languageCode}/speaker/${i}/similar_voices`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            },
          }
        );
        
        if (similarResponse.ok) {
          const similarData = await similarResponse.json();
          similarVoices = similarData.similar_voices || [];
        }
      } catch (e) {
        console.log(`Could not get similar voices for speaker ${i}`);
      }

      speakers.push({
        speaker_id: `speaker_${i}`,
        name: `Speaker ${i}`,
        similar_voices: similarVoices,
      });
    }

    return NextResponse.json({ 
      speakers,
      project: {
        dubbing_id: projectData.dubbing_id,
        name: projectData.name,
        source_language: projectData.source_language,
        target_languages: projectData.target_languages,
        num_speakers: numSpeakers,
      }
    });
  } catch (error) {
    console.error('Get speakers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
