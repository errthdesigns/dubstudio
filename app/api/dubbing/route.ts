import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetLanguage = formData.get('target_lang') as string;
    const sourceLanguage = formData.get('source_lang') as string || 'auto';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!targetLanguage) {
      return NextResponse.json(
        { error: 'No target language provided' },
        { status: 400 }
      );
    }

    console.log(`Creating dubbing project for ${file.name}, target: ${targetLanguage}`);

    // Create FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('file', file);
    elevenLabsFormData.append('target_lang', targetLanguage);
    elevenLabsFormData.append('source_lang', sourceLanguage);
    elevenLabsFormData.append('num_speakers', '0'); // Auto-detect
    elevenLabsFormData.append('watermark', 'false');

    const response = await fetch(`${ELEVENLABS_API_URL}/dubbing`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('ElevenLabs API error:', error);
      return NextResponse.json(
        { error: error.detail?.message || 'Failed to create dubbing project' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Dubbing project created:', data.dubbing_id);

    // Also transcribe the original audio with OpenAI Whisper
    // Return the transcript in the response so client can store it
    let originalTranscript = null;
    try {
      originalTranscript = await transcribeOriginal(file);
    } catch (err) {
      console.error('Original transcription error (non-fatal):', err);
    }

    return NextResponse.json({
      ...data,
      originalTranscript, // Include transcript in response for client-side storage
    });
  } catch (error) {
    console.error('Dubbing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function transcribeOriginal(file: File) {
  console.log(`Transcribing original audio...`);
  console.log(`File: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
  
  // Use OpenAI Whisper to transcribe
  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  console.log(`Original transcription complete: ${transcription.segments?.length} segments`);
  console.log(`Language detected: ${transcription.language}`);

  // Return the transcript data
  const segments = transcription.segments?.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
    speaker_id: 'speaker_1', // Whisper doesn't do speaker diarization
  })) || [];

  return { 
    segments,
    language: transcription.language,
    text: transcription.text,
  };
}
