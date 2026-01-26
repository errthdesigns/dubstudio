import { NextRequest, NextResponse } from 'next/server';
import { getOriginalTranscription } from '@/lib/transcription-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`Fetching original transcription for ${id}`);
    
    const transcription = await getOriginalTranscription(id);
    
    if (transcription && transcription.segments?.length > 0) {
      console.log(`Found cached transcription with ${transcription.segments.length} segments`);
      return NextResponse.json(transcription);
    }

    console.log('No cached transcription found for', id);
    return NextResponse.json({ segments: [] });
  } catch (error) {
    console.error('Get original transcript error:', error);
    return NextResponse.json(
      { error: 'Internal server error', segments: [] },
      { status: 500 }
    );
  }
}
