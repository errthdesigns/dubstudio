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
  const [scriptWasEdited, setScriptWasEdited] = useState(false);

  // If we only have translated text (no original), show it prominently
  const hasOriginal = originalText && originalText.trim().length > 0;
  const hasTranslated = translatedText && translatedText.trim().length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Speaker Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: speakerColor }}
          />
          <span className="text-sm font-medium text-gray-900">{speakerName}</span>
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
        <div className="flex-1 p-3 border-r border-gray-100">
          {isEditingOriginal ? (
            <textarea
              value={originalText}
              onChange={(e) => onOriginalChange(e.target.value)}
              onBlur={() => setIsEditingOriginal(false)}
              autoFocus
              className="w-full min-h-[60px] bg-gray-50 text-gray-900 text-sm p-2 rounded border border-gray-200 resize-none focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <div
              onClick={() => setIsEditingOriginal(true)}
              className="min-h-[60px] cursor-text hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
            >
              {hasOriginal ? (
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{originalText}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {hasTranslated ? '(Original not available)' : 'No transcription'}
                </p>
              )}
            </div>
          )}
          {onTranscribe && (
            <button
              onClick={onTranscribe}
              disabled={isProcessing}
              className="mt-2 text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Transcribe Audio
            </button>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center px-2 text-gray-400 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>

        {/* Translated Text */}
        <div className="flex-1 p-3">
          {isEditingTranslated ? (
            <textarea
              value={translatedText}
              onChange={(e) => {
                onTranslatedChange(e.target.value);
                setScriptWasEdited(true);
              }}
              onBlur={() => setIsEditingTranslated(false)}
              autoFocus
              className="w-full min-h-[60px] bg-gray-50 text-gray-900 text-sm p-2 rounded border border-gray-200 resize-none focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <div
              onClick={() => setIsEditingTranslated(true)}
              className="min-h-[60px] cursor-text hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
            >
              {hasTranslated ? (
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{translatedText}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No translation</p>
              )}
            </div>
          )}
          {onGenerateAudio && (
            <button
              onClick={onGenerateAudio}
              disabled={isProcessing}
              className="mt-2 text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Generate Audio
            </button>
          )}
          {scriptWasEdited && (
            <button
              onClick={() => {}}
              className="mt-2 ml-2 text-xs text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-generate Audio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
