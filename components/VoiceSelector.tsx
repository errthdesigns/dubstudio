'use client';

import { useState, useEffect } from 'react';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  isSchwarzkopfVoice?: boolean;
}

interface VoiceSelectorProps {
  speakerId: string;
  speakerName: string;
  currentVoice?: Voice;
  similarVoices?: Voice[];
  onVoiceSelect?: (voiceId: string) => void;
}

export default function VoiceSelector({
  speakerId,
  speakerName,
  currentVoice,
  similarVoices = [],
  onVoiceSelect,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [voices, setVoices] = useState<Voice[]>(similarVoices);
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | undefined>(currentVoice);

  // Fetch voices when dropdown opens
  useEffect(() => {
    if (isOpen && voices.length === 0) {
      setLoading(true);
      fetch('/api/voices')
        .then(res => res.json())
        .then(data => {
          console.log('Fetched voices:', data.voices?.length);
          setVoices(data.voices || []);
        })
        .catch(err => {
          console.error('Failed to fetch voices:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, voices.length]);

  const playPreview = (previewUrl: string, voiceId: string) => {
    if (audioElement) {
      audioElement.pause();
    }

    if (playingPreview === voiceId) {
      setPlayingPreview(null);
      return;
    }

    const audio = new Audio(previewUrl);
    audio.onended = () => setPlayingPreview(null);
    audio.play();
    setAudioElement(audio);
    setPlayingPreview(voiceId);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span className="text-gray-700">
          {selectedVoice?.name || 'Auto-selected voice'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[450px] max-h-[500px] bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Select voice for {speakerName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {loading ? 'Loading...' : `${voices.length} voices available`}
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading your ElevenLabs voices...</p>
                </div>
              ) : voices.length > 0 ? (
                <>
                  {/* Schwarzkopf Voices Section */}
                  {voices.some(v => v.isSchwarzkopfVoice) && (
                    <>
                      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Schwarzkopf Voices</span>
                        </div>
                      </div>
                      {voices.filter(v => v.isSchwarzkopfVoice).map((voice) => (
                        <div
                          key={voice.voice_id}
                          className={`flex items-center justify-between p-4 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 ${
                            selectedVoice?.voice_id === voice.voice_id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-emerald-200'
                          }`}
                          onClick={() => {
                            setSelectedVoice(voice);
                            onVoiceSelect?.(voice.voice_id);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-900 font-medium">{voice.name}</p>
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded font-medium">
                                SCHWARZKOPF
                              </span>
                              {selectedVoice?.voice_id === voice.voice_id && (
                                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {voice.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {voice.category}
                              </span>
                            )}
                          </div>
                          {voice.preview_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playPreview(voice.preview_url!, voice.voice_id);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"
                              title="Preview voice"
                            >
                              {playingPreview === voice.voice_id ? (
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Other Voices Section */}
                  {voices.some(v => !v.isSchwarzkopfVoice) && (
                    <>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Voices</span>
                      </div>
                      {voices.filter(v => !v.isSchwarzkopfVoice).map((voice) => (
                        <div
                          key={voice.voice_id}
                          className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                            selectedVoice?.voice_id === voice.voice_id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
                          }`}
                          onClick={() => {
                            setSelectedVoice(voice);
                            onVoiceSelect?.(voice.voice_id);
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-900 font-medium">{voice.name}</p>
                              {selectedVoice?.voice_id === voice.voice_id && (
                                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {voice.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {voice.category}
                              </span>
                            )}
                          </div>
                          {voice.preview_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playPreview(voice.preview_url!, voice.voice_id);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"
                              title="Preview voice"
                            >
                              {playingPreview === voice.voice_id ? (
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="font-medium">No voices found</p>
                  <p className="text-xs mt-1">Check your ElevenLabs API key</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
