const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface DubbingProject {
  dubbing_id: string;
  name: string;
  status: 'dubbing' | 'dubbed' | 'failed';
  target_languages: string[];
  error?: string;
}

export interface Speaker {
  speaker_id: string;
  name: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker_id: string;
}

export interface Transcript {
  segments: TranscriptSegment[];
  speakers: Speaker[];
}

export async function createDubbingProject(
  file: File,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<DubbingProject> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_lang', targetLanguage);
  formData.append('source_lang', sourceLanguage);
  formData.append('num_speakers', '0'); // Auto-detect
  formData.append('watermark', 'false');

  const response = await fetch(`${ELEVENLABS_API_URL}/dubbing`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to create dubbing project');
  }

  return response.json();
}

export async function getDubbingProject(dubbingId: string): Promise<DubbingProject> {
  const response = await fetch(`${ELEVENLABS_API_URL}/dubbing/${dubbingId}`, {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to get dubbing project');
  }

  return response.json();
}

export async function getTranscript(
  dubbingId: string,
  languageCode: string
): Promise<Transcript> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/dubbing/${dubbingId}/transcript/${languageCode}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to get transcript');
  }

  return response.json();
}

export async function getDubbedAudio(
  dubbingId: string,
  languageCode: string
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/dubbing/${dubbingId}/audio/${languageCode}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to get dubbed audio');
  }

  return response.arrayBuffer();
}

export async function deleteDubbingProject(dubbingId: string): Promise<void> {
  const response = await fetch(`${ELEVENLABS_API_URL}/dubbing/${dubbingId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to delete dubbing project');
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pl', name: 'Polish' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];
