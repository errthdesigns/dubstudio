import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('Transcribing audio file:', file.name, file.size);

    // Use OpenAI Whisper to transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    console.log('Transcription complete:', transcription.segments?.length, 'segments');

    // Format the response to match our expected format
    const segments = transcription.segments?.map((seg, index) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      speaker_id: `speaker_1`, // Whisper doesn't do speaker diarization
    })) || [];

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
