export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
}

export interface DubbingProject {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'transcribing' | 'ready' | 'error';
  sourceLanguage: string;
  targetLanguage: string;
  videoUrl: string;
  originalAudioUrl?: string;
  dubbedAudioUrl?: string;
  speakers: Speaker[];
  segments: TranscriptSegment[];
  duration: number;
  createdAt: Date;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'original' | 'background' | 'foreground' | 'speaker';
  speakerId?: string;
  muted: boolean;
  segments: {
    id: string;
    startTime: number;
    endTime: number;
    waveform?: number[];
  }[];
}

export const SPEAKER_COLORS = [
  '#f472b6', // Pink
  '#60a5fa', // Blue
  '#34d399', // Green
  '#fbbf24', // Yellow
  '#a78bfa', // Purple
  '#fb7185', // Rose
  '#38bdf8', // Sky
  '#4ade80', // Emerald
];
