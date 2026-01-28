'use client';

import SpeakerCard from './SpeakerCard';
import { SPEAKER_COLORS } from '@/lib/types';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
}

interface SpeakerVoiceData {
  speakerId: string;
  currentVoice?: Voice;
  similarVoices: Voice[];
}

interface Segment {
  id: string;
  speakerId: string;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
}

interface Speaker {
  id: string;
  name: string;
}

interface TranscriptionPanelProps {
  speakers: Speaker[];
  segments: Segment[];
  speakerVoices?: SpeakerVoiceData[];
  onSegmentOriginalChange: (segmentId: string, text: string) => void;
  onSegmentTranslatedChange: (segmentId: string, text: string) => void;
  onSegmentSpeakerChange?: (segmentId: string, newSpeakerId: string) => void;
  onVoiceSelect?: (speakerId: string, voiceId: string) => void;
  onTranscribe?: (speakerId: string) => void;
  onGenerateAudio?: (speakerId: string) => void;
  isProcessing?: boolean;
  needsRegeneration?: boolean;
  isRegenerating?: boolean;
  onRegenerateAudio?: () => void;
}

export default function TranscriptionPanel({
  speakers,
  segments,
  speakerVoices,
  onSegmentOriginalChange,
  onSegmentTranslatedChange,
  onSegmentSpeakerChange,
  onVoiceSelect,
  onTranscribe,
  onGenerateAudio,
  isProcessing,
  needsRegeneration,
  isRegenerating,
  onRegenerateAudio,
}: TranscriptionPanelProps) {
  // Create a map of speaker colors
  const speakerColorMap = new Map<string, string>();
  speakers.forEach((speaker, index) => {
    speakerColorMap.set(speaker.id, SPEAKER_COLORS[index % SPEAKER_COLORS.length]);
  });

  // Create available speakers list with colors for the dropdown
  const availableSpeakers = speakers.map((speaker, index) => ({
    id: speaker.id,
    name: speaker.name,
    color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
  }));

  // Get speaker name by ID
  const getSpeakerName = (speakerId: string): string => {
    const speaker = speakers.find(s => s.id === speakerId);
    return speaker?.name || 'Speaker';
  };

  // Get speaker color by ID
  const getSpeakerColor = (speakerId: string): string => {
    return speakerColorMap.get(speakerId) || SPEAKER_COLORS[0];
  };

  // Get voice data for a speaker
  const getSpeakerVoiceData = (speakerId: string): SpeakerVoiceData | undefined => {
    return speakerVoices?.find(sv => sv.speakerId === speakerId);
  };

  // Sort segments by start time for chronological display
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">Transcription</span>
          <div className="flex items-center gap-3">
            {needsRegeneration && onRegenerateAudio && (
              <button
                onClick={onRegenerateAudio}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isRegenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate Audio
                  </>
                )}
              </button>
            )}
            <span className="text-xs text-gray-500">{segments.length} segments</span>
          </div>
        </div>
      </div>

      {/* Segments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedSegments.map((segment) => {
          const voiceData = getSpeakerVoiceData(segment.speakerId);
          return (
            <SpeakerCard
              key={segment.id}
              speakerName={getSpeakerName(segment.speakerId)}
              speakerId={segment.speakerId}
              speakerColor={getSpeakerColor(segment.speakerId)}
              originalText={segment.originalText}
              translatedText={segment.translatedText}
              onOriginalChange={(text) => onSegmentOriginalChange(segment.id, text)}
              onTranslatedChange={(text) => onSegmentTranslatedChange(segment.id, text)}
              onSpeakerChange={onSegmentSpeakerChange ? (newSpeakerId) => onSegmentSpeakerChange(segment.id, newSpeakerId) : undefined}
              availableSpeakers={availableSpeakers}
              onTranscribe={onTranscribe ? () => onTranscribe(segment.speakerId) : undefined}
              onGenerateAudio={onGenerateAudio ? () => onGenerateAudio(segment.speakerId) : undefined}
              isProcessing={isProcessing}
              currentVoice={voiceData?.currentVoice}
              similarVoices={voiceData?.similarVoices}
              onVoiceSelect={onVoiceSelect ? (voiceId) => onVoiceSelect(segment.speakerId, voiceId) : undefined}
              showVoiceSelector={!!speakerVoices && speakerVoices.length > 0}
            />
          );
        })}

        {segments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <p className="text-sm">No transcription available yet</p>
            <p className="text-xs mt-1">Processing your video...</p>
          </div>
        )}
      </div>
    </div>
  );
}
