'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer, { VideoPlayerRef } from '@/components/VideoPlayer';
import TranscriptionPanel from '@/components/TranscriptionPanel';
import Timeline from '@/components/Timeline';
import { SPEAKER_COLORS } from '@/lib/types';

interface Speaker {
  id: string;
  name: string;
}

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

interface TimelineTrack {
  id: string;
  name: string;
  type: 'original' | 'background' | 'foreground' | 'speaker';
  color?: string;
  muted: boolean;
  segments: { id: string; startTime: number; endTime: number }[];
}

type ProjectStatus = 'processing' | 'ready' | 'error';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pl: 'Polish',
};

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const dubbingId = params.id as string;
  
  const videoRef = useRef<VideoPlayerRef>(null);
  
  const [status, setStatus] = useState<ProjectStatus>('processing');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('fr');
  
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [tracks, setTracks] = useState<TimelineTrack[]>([]);
  const [speakerVoices, setSpeakerVoices] = useState<SpeakerVoiceData[]>([]);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [activeLanguage, setActiveLanguage] = useState<'original' | 'dubbed'>('dubbed');
  const [isSaving, setIsSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load video URL from session storage
  useEffect(() => {
    const storedVideoUrl = sessionStorage.getItem('uploadedVideoUrl');
    const storedFileName = sessionStorage.getItem('uploadedFileName');
    const storedLanguage = sessionStorage.getItem('targetLanguage');
    
    if (storedVideoUrl) setVideoUrl(storedVideoUrl);
    if (storedFileName) setFileName(storedFileName);
    if (storedLanguage) setTargetLanguage(storedLanguage);
  }, []);

  // Poll for dubbing status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/dubbing/${dubbingId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get project status');
        }

        const data = await response.json();
        console.log('Dubbing status:', data);
        
        if (data.status === 'dubbed') {
          setStatus('ready');
          clearInterval(pollInterval);
          
          // Fetch transcripts and dubbed audio (voices are fetched inside fetchTranscripts)
          await fetchTranscripts();
          await fetchDubbedAudio();
        } else if (data.status === 'failed') {
          setStatus('error');
          setError(data.error || 'Dubbing failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    checkStatus();
    pollInterval = setInterval(checkStatus, 3000);

    return () => clearInterval(pollInterval);
  }, [dubbingId]);

  const fetchDubbedAudio = async () => {
    try {
      // Fetch the dubbed audio and create a blob URL
      const response = await fetch(`/api/dubbing/${dubbingId}/audio/${targetLanguage}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setDubbedAudioUrl(url);
        console.log('Dubbed audio loaded:', url);
      } else {
        console.error('Failed to fetch dubbed audio');
      }
    } catch (err) {
      console.error('Error fetching dubbed audio:', err);
    }
  };

  const fetchVoices = async (speakersList?: Speaker[]) => {
    try {
      console.log('Fetching available voices...');
      const response = await fetch('/api/voices');
      if (response.ok) {
        const data = await response.json();
        const voices = data.voices || [];
        setAvailableVoices(voices);
        console.log('Available voices:', voices.length);
        
        // Use passed speakers or current state
        const currentSpeakers = speakersList || speakers;
        
        // Create speaker voice data with available voices as options
        if (currentSpeakers.length > 0) {
          const voiceData: SpeakerVoiceData[] = currentSpeakers.map((speaker) => ({
            speakerId: speaker.id,
            currentVoice: undefined, // Auto-selected by ElevenLabs
            similarVoices: voices.slice(0, 10), // Show first 10 voices as options
          }));
          setSpeakerVoices(voiceData);
          console.log('Speaker voice data created for', currentSpeakers.length, 'speakers');
        }
      }
    } catch (err) {
      console.error('Error fetching voices:', err);
    }
  };

  const fetchTranscripts = async () => {
    try {
      console.log('Fetching transcripts...');
      
      // Get original transcript from sessionStorage (stored during upload)
      let originalTranscript: any = { segments: [] };
      
      // First try sessionStorage (works on Vercel)
      const storedTranscript = sessionStorage.getItem('originalTranscript');
      if (storedTranscript) {
        try {
          originalTranscript = JSON.parse(storedTranscript);
          console.log('Original transcript from sessionStorage:', originalTranscript.segments?.length);
        } catch (e) {
          console.log('Could not parse stored transcript');
        }
      }
      
      // Fallback: try API (works locally)
      if (!originalTranscript.segments || originalTranscript.segments.length === 0) {
        try {
          const originalResponse = await fetch(`/api/dubbing/${dubbingId}/original-transcript`);
          if (originalResponse.ok) {
            originalTranscript = await originalResponse.json();
            console.log('Original transcript from API:', originalTranscript.segments?.length);
          }
        } catch (e) {
          console.log('Could not fetch original transcript from API');
        }
      }

      // Fetch translated transcript
      let translatedTranscript: any = { segments: [] };
      try {
        const translatedResponse = await fetch(`/api/dubbing/${dubbingId}/transcript/${targetLanguage}`);
        if (translatedResponse.ok) {
          translatedTranscript = await translatedResponse.json();
          console.log(`Translated (${targetLanguage}) transcript segments:`, translatedTranscript.segments?.length);
        }
      } catch (e) {
        console.log(`Could not fetch ${targetLanguage} transcript`);
      }

      // Process speakers and segments
      const speakerMap = new Map<string, Speaker>();
      const processedSegments: Segment[] = [];

      // Use whichever transcript has segments
      const hasOriginal = originalTranscript.segments && originalTranscript.segments.length > 0;
      const hasTranslated = translatedTranscript.segments && translatedTranscript.segments.length > 0;
      
      console.log('Has original (Whisper) segments:', hasOriginal);
      console.log('Has translated (ElevenLabs) segments:', hasTranslated);

      // Use the transcript with segments as primary
      const primaryTranscript = hasOriginal ? originalTranscript : translatedTranscript;
      const secondaryTranscript = hasOriginal ? translatedTranscript : originalTranscript;
      const primaryIsOriginal = hasOriginal;

      // Process transcript segments
      if (primaryTranscript.segments && primaryTranscript.segments.length > 0) {
        primaryTranscript.segments.forEach((seg: any, index: number) => {
          const speakerId = seg.speaker_id || seg.speaker || `speaker_${(index % 2) + 1}`;
          
          if (!speakerMap.has(speakerId)) {
            speakerMap.set(speakerId, {
              id: speakerId,
              name: `Speaker ${speakerMap.size + 1}`,
            });
          }

          // Find matching segment in secondary transcript by time proximity
          let secondarySeg = secondaryTranscript.segments?.[index];
          if (!secondarySeg && secondaryTranscript.segments?.length > 0) {
            // Try to find by closest start time
            secondarySeg = secondaryTranscript.segments.find((s: any) => 
              Math.abs((s.start || 0) - (seg.start || 0)) < 1
            );
          }
          
          processedSegments.push({
            id: `seg_${index}`,
            speakerId,
            startTime: seg.start || seg.start_time || index * 3,
            endTime: seg.end || seg.end_time || (index + 1) * 3,
            originalText: primaryIsOriginal ? (seg.text || '') : (secondarySeg?.text || ''),
            translatedText: primaryIsOriginal ? (secondarySeg?.text || seg.text || '') : (seg.text || ''),
          });
        });
        
        console.log('Processed segments:', processedSegments.length);
      }

      // If still no segments, the transcription might not be ready yet
      if (processedSegments.length === 0) {
        console.log('No segments found - transcript may still be processing');
      }

      const speakersArray = Array.from(speakerMap.values());
      setSpeakers(speakersArray);
      setSegments(processedSegments);
      
      // Fetch voices after we have speakers
      if (speakersArray.length > 0) {
        fetchVoices(speakersArray);
      }

      // Build timeline tracks
      const videoDuration = duration || 30;
      const timelineTracks: TimelineTrack[] = [
        {
          id: 'original',
          name: 'Original sound',
          type: 'original',
          muted: activeLanguage === 'dubbed',
          segments: [{ id: 'orig_1', startTime: 0, endTime: videoDuration }],
        },
        {
          id: 'background',
          name: 'Background',
          type: 'background',
          muted: false,
          segments: [{ id: 'bg_1', startTime: 0, endTime: videoDuration }],
        },
        {
          id: 'foreground',
          name: 'Foreground',
          type: 'foreground',
          muted: false,
          segments: [],
        },
      ];

      // Add speaker tracks
      speakersArray.forEach((speaker, index) => {
        const speakerSegments = processedSegments
          .filter(s => s.speakerId === speaker.id)
          .map(s => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
          }));

        timelineTracks.push({
          id: `speaker_${speaker.id}`,
          name: `${speaker.name}\nOriginal`,
          type: 'speaker',
          color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
          muted: false,
          segments: speakerSegments,
        });
      });

      setTracks(timelineTracks);
    } catch (err) {
      console.error('Failed to fetch transcripts:', err);
    }
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const handleSeek = useCallback((time: number) => {
    videoRef.current?.seek(time);
  }, []);

  const handleSegmentOriginalChange = (segmentId: string, text: string) => {
    setSegments(prev =>
      prev.map(s => (s.id === segmentId ? { ...s, originalText: text } : s))
    );
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleSegmentTranslatedChange = (segmentId: string, text: string) => {
    setSegments(prev =>
      prev.map(s => (s.id === segmentId ? { ...s, translatedText: text } : s))
    );
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleTrackMuteToggle = (trackId: string) => {
    setTracks(prev =>
      prev.map(t => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
  };

  const handleVoiceSelect = (speakerId: string, voiceId: string) => {
    console.log(`Voice selected for ${speakerId}: ${voiceId}`);
    // Update the speaker's selected voice
    setSpeakerVoices(prev =>
      prev.map(sv => {
        if (sv.speakerId === speakerId) {
          const selectedVoice = availableVoices.find(v => v.voice_id === voiceId);
          return { ...sv, currentVoice: selectedVoice };
        }
        return sv;
      })
    );
    // Note: In a full implementation, this would trigger re-generation of the dubbed audio
    // with the new voice selection
  };

  const handleExportVideo = async () => {
    try {
      const response = await fetch(`/api/dubbing/${dubbingId}/audio/${targetLanguage}`);
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dubbed_video_${targetLanguage}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleExportAudio = async () => {
    try {
      const response = await fetch(`/api/dubbing/${dubbingId}/audio/${targetLanguage}`);
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dubbed_audio_${targetLanguage}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Please try again.');
    }
  };

  // Toggle between original and dubbed audio
  const handleLanguageToggle = (lang: 'original' | 'dubbed') => {
    setActiveLanguage(lang);
    // Update track mute states
    setTracks(prev =>
      prev.map(t => {
        if (t.id === 'original') {
          return { ...t, muted: lang === 'dubbed' };
        }
        return t;
      })
    );
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-medium text-white mb-2">Processing your video</h2>
          <p className="text-gray-400">This may take a few minutes...</p>
          <p className="text-sm text-gray-500 mt-4">
            Transcribing audio, detecting speakers, and generating dubbed audio
          </p>
          <div className="mt-8 text-xs text-gray-600">
            Project ID: {dubbingId}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Processing failed</h2>
          <p className="text-gray-400 mb-6">{error || 'An error occurred while processing your video'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">DubStudio</span>
          </div>
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-sm font-medium text-white truncate max-w-md mx-auto">
            {fileName || 'Untitled Project'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {isSaving ? 'Saving changes...' : 'All changes saved'}
          </span>
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Transcriptions */}
        <div className="w-[400px] flex-shrink-0 border-r border-[#2a2a2a] overflow-hidden">
          <TranscriptionPanel
            speakers={speakers}
            segments={segments}
            speakerVoices={speakerVoices}
            onSegmentOriginalChange={handleSegmentOriginalChange}
            onSegmentTranslatedChange={handleSegmentTranslatedChange}
            onVoiceSelect={handleVoiceSelect}
          />
        </div>

        {/* Right Panel - Video Player */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden">
            {videoUrl ? (
              <VideoPlayer
                ref={videoRef}
                src={videoUrl}
                dubbedAudioSrc={dubbedAudioUrl}
                playDubbedAudio={activeLanguage === 'dubbed'}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="h-full bg-[#141414] rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No video loaded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-shrink-0 h-[200px] border-t border-[#2a2a2a]">
        <Timeline
          tracks={tracks}
          duration={duration || 30}
          currentTime={currentTime}
          onSeek={handleSeek}
          onTrackMuteToggle={handleTrackMuteToggle}
          selectedLanguage={LANGUAGE_NAMES[targetLanguage] || targetLanguage}
        />
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 border-t border-[#2a2a2a] px-4 py-3 flex items-center justify-between bg-[#0d0d0d]">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">Free credits remaining: 7666</span>
          {dubbedAudioUrl && (
            <span className="text-xs text-emerald-500">✓ Dubbed audio ready</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleLanguageToggle('original')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeLanguage === 'original'
                ? 'bg-[#1a1a1a] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => handleLanguageToggle('dubbed')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeLanguage === 'dubbed'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {LANGUAGE_NAMES[targetLanguage] || targetLanguage}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAudio}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Generate Stale Audio
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Export
            </button>
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden min-w-[180px]">
                    <button
                      onClick={() => {
                        handleExportVideo();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#2a2a2a] transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Download Video
                    </button>
                    <button
                      onClick={() => {
                        handleExportAudio();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#2a2a2a] transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      Download Audio
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
