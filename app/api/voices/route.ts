import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Custom Henkel voice IDs - these will be prioritized at the top
const HENKEL_VOICE_IDS = [
  'RQvNZqghdI6DJZQGlS6z', // Henkle Man - French
  'UetQvP6QBCAbMCtDOdNn', // Henkle Woman - French
  'ECcbt2NBz2UzKu3M0WwL', // Henkle Robot - French
];

// Get all available voices from ElevenLabs
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching voices from ElevenLabs...');
    
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    console.log('Voices response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Voices API error:', error);
      return NextResponse.json(
        { error: error.detail?.message || 'Failed to get voices' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Total voices returned:', data.voices?.length);
    
    // Map voices and mark Henkel voices
    const voices = data.voices?.map((voice: any) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      labels: voice.labels,
      preview_url: voice.preview_url,
      isHenkelVoice: HENKEL_VOICE_IDS.includes(voice.voice_id),
    })) || [];

    // Sort voices: Henkel voices first, then others
    const sortedVoices = voices.sort((a: any, b: any) => {
      if (a.isHenkelVoice && !b.isHenkelVoice) return -1;
      if (!a.isHenkelVoice && b.isHenkelVoice) return 1;
      return 0;
    });

    console.log('Henkel voices found:', sortedVoices.filter((v: any) => v.isHenkelVoice).length);

    return NextResponse.json({ voices: sortedVoices });
  } catch (error) {
    console.error('Get voices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
