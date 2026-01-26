import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lang: string }> }
) {
  try {
    const { id, lang } = await params;

    console.log(`Fetching audio for dubbing ${id}, language ${lang}`);

    const response = await fetch(
      `${ELEVENLABS_API_URL}/dubbing/${id}/audio/${lang}`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Accept': 'audio/mpeg',
        },
      }
    );

    console.log(`Audio response status: ${response.status}`);
    console.log(`Audio response content-type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      let errorMessage = 'Failed to get audio';
      try {
        const error = await response.json();
        errorMessage = error.detail?.message || error.detail || errorMessage;
      } catch {
        errorMessage = await response.text();
      }
      console.error('Audio API error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio buffer size: ${audioBuffer.byteLength} bytes`);
    
    // Get content type from response or default to audio/mpeg
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Content-Disposition': `attachment; filename="dubbed_audio_${lang}.mp3"`,
      },
    });
  } catch (error) {
    console.error('Get audio error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
