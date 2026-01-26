'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface VideoPlayerProps {
  src: string;
  dubbedAudioSrc?: string;
  playDubbedAudio?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ src, dubbedAudioSrc, playDubbedAudio = false, onTimeUpdate, onDurationChange, onPlay, onPause }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const dubbedAudioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [audioLoaded, setAudioLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => {
        videoRef.current?.play();
        if (playDubbedAudio && dubbedAudioRef.current) {
          dubbedAudioRef.current.play();
        }
      },
      pause: () => {
        videoRef.current?.pause();
        dubbedAudioRef.current?.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
        if (dubbedAudioRef.current) {
          dubbedAudioRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
    }));

    // Sync dubbed audio with video
    useEffect(() => {
      const video = videoRef.current;
      const dubbedAudio = dubbedAudioRef.current;
      
      if (!video || !dubbedAudio) return;

      // Mute video when playing dubbed audio
      video.muted = playDubbedAudio;
      
      // Sync audio time with video
      if (Math.abs(dubbedAudio.currentTime - video.currentTime) > 0.3) {
        dubbedAudio.currentTime = video.currentTime;
      }

      // Play/pause dubbed audio based on video state and toggle
      if (playDubbedAudio && isPlaying) {
        dubbedAudio.play().catch(() => {});
      } else {
        dubbedAudio.pause();
      }
    }, [playDubbedAudio, isPlaying]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        onTimeUpdate?.(video.currentTime);
        
        // Keep dubbed audio in sync
        const dubbedAudio = dubbedAudioRef.current;
        if (dubbedAudio && Math.abs(dubbedAudio.currentTime - video.currentTime) > 0.3) {
          dubbedAudio.currentTime = video.currentTime;
        }
      };

      const handleDurationChange = () => {
        setDuration(video.duration);
        onDurationChange?.(video.duration);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
        
        // Play dubbed audio if enabled
        if (playDubbedAudio && dubbedAudioRef.current) {
          dubbedAudioRef.current.play().catch(() => {});
        }
      };

      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
        
        // Pause dubbed audio
        dubbedAudioRef.current?.pause();
      };

      const handleSeeked = () => {
        // Sync dubbed audio when video is seeked
        if (dubbedAudioRef.current) {
          dubbedAudioRef.current.currentTime = video.currentTime;
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('seeked', handleSeeked);
      };
    }, [onTimeUpdate, onDurationChange, onPlay, onPause, playDubbedAudio]);

    // Handle dubbed audio volume
    useEffect(() => {
      if (dubbedAudioRef.current) {
        dubbedAudioRef.current.volume = isMuted ? 0 : volume;
      }
    }, [volume, isMuted]);

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      if (dubbedAudioRef.current) {
        dubbedAudioRef.current.currentTime = newTime;
      }
    };

    const togglePlay = () => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
          dubbedAudioRef.current?.pause();
        } else {
          videoRef.current.play();
          if (playDubbedAudio && dubbedAudioRef.current) {
            dubbedAudioRef.current.play().catch(() => {});
          }
        }
      }
    };

    const toggleMute = () => {
      setIsMuted(!isMuted);
      if (videoRef.current && !playDubbedAudio) {
        videoRef.current.muted = !isMuted;
      }
    };

    return (
      <div className="bg-black rounded-lg overflow-hidden h-full flex flex-col">
        {/* Hidden dubbed audio element */}
        {dubbedAudioSrc && (
          <audio
            ref={dubbedAudioRef}
            src={dubbedAudioSrc}
            preload="auto"
            onCanPlayThrough={() => setAudioLoaded(true)}
          />
        )}
        
        {/* Video */}
        <div className="relative flex-1 bg-black min-h-0">
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            playsInline
            muted={playDubbedAudio}
          />
          
          {/* Loading indicator for dubbed audio */}
          {dubbedAudioSrc && !audioLoaded && playDubbedAudio && (
            <div className="absolute top-4 right-4 bg-black/70 px-3 py-1 rounded-full text-xs text-white flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Loading dubbed audio...
            </div>
          )}
          
          {/* Audio source indicator */}
          <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-xs text-white">
            {playDubbedAudio ? '🔊 Dubbed Audio' : '🔊 Original Audio'}
          </div>
          
          {/* Overlay Controls */}
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer group"
            onClick={togglePlay}
          >
            <div
              className={`
                w-16 h-16 rounded-full bg-black/50 flex items-center justify-center
                transition-opacity group-hover:opacity-100
                ${isPlaying ? 'opacity-0' : 'opacity-100'}
              `}
            >
              {isPlaying ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex-shrink-0 bg-[#141414] px-4 py-3">
          {/* Progress Bar */}
          <div
            className="h-1 bg-[#2a2a2a] rounded-full cursor-pointer mb-3 group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-emerald-500 rounded-full relative"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-emerald-400 transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-emerald-400 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    if (videoRef.current && !playDubbedAudio) {
                      videoRef.current.volume = newVolume;
                    }
                    if (dubbedAudioRef.current) {
                      dubbedAudioRef.current.volume = newVolume;
                    }
                    if (newVolume > 0) setIsMuted(false);
                  }}
                  className="w-20 accent-emerald-500"
                />
              </div>

              {/* Time */}
              <span className="text-sm text-gray-400 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen placeholder */}
              <button className="text-white hover:text-emerald-400 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
