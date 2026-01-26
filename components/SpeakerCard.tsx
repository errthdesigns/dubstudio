'use client';

import { useState } from 'react';
import VoiceSelector from './VoiceSelector';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
}

interface SpeakerCardProps {
  speakerName: string;
  speakerColor: string;
  originalText: string;
  translatedText: string;
  onOriginalChange: (text: string) => void;
  onTranslatedChange: (text: string) => void;
  onTranscribe?: () => void;
  onGenerateAudio?: () => void;
  isProcessing?: boolean;
  currentVoice?: Voice;
  similarVoices?: Voice[];
  onVoiceSelect?: (voiceId: string) => void;
  showVoiceSelector?: boolean;
}

export default function SpeakerCard({
  speakerName,
  speakerColor,
  originalText,
  translatedText,
  onOriginalChange,
  onTranslatedChange,
  onTranscribe,
  onGenerateAudio,
  isProcessing,
  currentVoice,
  similarVoices,
  onVoiceSelect,
  showVoiceSelector = true,
}: SpeakerCardProps) {
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);
  const [isEditingTranslated, setIsEditingTranslated] = useState(false);

  // If we only have translated text (no original), show it prominently
  const hasOriginal = originalText && originalText.trim().length > 0;
  const hasTranslated = translatedText && translatedText.trim().length > 0;

  return (
    <div className="bg-[#141414] rounded-lg border border-[#2a2a2a] overflow-hidden">
      {/* Speaker Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: speakerColor }}
          />
          <span className="text-sm font-medium text-white">{speakerName}</span>
        </div>
        
        {showVoiceSelector && (
          <VoiceSelector
            speakerId={speakerName}
            speakerName={speakerName}
            currentVoice={currentVoice}
            similarVoices={similarVoices}
            onVoiceSelect={onVoiceSelect}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex">
        {/* Original Text */}
        <div className="flex-1 p-3 border-r border-[#2a2a2a]">
          {isEditingOriginal ? (
            <textarea
              value={originalText}
              onChange={(e) => onOriginalChange(e.target.value)}
              onBlur={() => setIsEditingOriginal(false)}
              autoFocus
              className="w-full min-h-[60px] bg-[#1a1a1a] text-white text-sm p-2 rounded border border-[#3a3a3a] resize-none focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <div
              onClick={() => setIsEditingOriginal(true)}
              className="min-h-[60px] cursor-text hover:bg-[#1a1a1a] rounded p-2 -m-2 transition-colors"
            >
              {hasOriginal ? (
                <p className="text-sm text-white whitespace-pre-wrap break-words">{originalText}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {hasTranslated ? '(Original not available)' : 'No transcription'}
                </p>
              )}
            </div>
          )}
          {onTranscribe && (
            <button
              onClick={onTranscribe}
              disabled={isProcessing}
              className="mt-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Transcribe Audio
            </button>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center px-2 text-gray-500 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>

        {/* Translated Text */}
        <div className="flex-1 p-3">
          {isEditingTranslated ? (
            <textarea
              value={translatedText}
              onChange={(e) => onTranslatedChange(e.target.value)}
              onBlur={() => setIsEditingTranslated(false)}
              autoFocus
              className="w-full min-h-[60px] bg-[#1a1a1a] text-white text-sm p-2 rounded border border-[#3a3a3a] resize-none focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <div
              onClick={() => setIsEditingTranslated(true)}
              className="min-h-[60px] cursor-text hover:bg-[#1a1a1a] rounded p-2 -m-2 transition-colors"
            >
              {hasTranslated ? (
                <p className="text-sm text-white whitespace-pre-wrap break-words">{translatedText}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">No translation</p>
              )}
            </div>
          )}
          {onGenerateAudio && (
            <button
              onClick={onGenerateAudio}
              disabled={isProcessing}
              className="mt-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Generate Audio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
