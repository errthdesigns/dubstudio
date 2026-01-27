import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(`${ELEVENLABS_API_URL}/dubbing/${id}`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail?.message || 'Failed to get dubbing project' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log detailed dubbing info for debugging
    console.log('Dubbing project details:', {
      id: data.dubbing_id,
      status: data.status,
      source_language: data.source_language,
      target_languages: data.target_languages,
      error: data.error,
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get dubbing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(`${ELEVENLABS_API_URL}/dubbing/${id}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail?.message || 'Failed to delete dubbing project' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dubbing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
