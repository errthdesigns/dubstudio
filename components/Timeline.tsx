'use client';

import { useRef, useEffect, useState } from 'react';

interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: 'original' | 'background' | 'foreground' | 'speaker';
  color?: string;
  muted: boolean;
  segments: TimelineSegment[];
}

interface TimelineProps {
  tracks: TimelineTrack[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onTrackMuteToggle?: (trackId: string) => void;
  selectedLanguage?: string; // Kept for backwards compatibility but no longer displayed
}

export default function Timeline({
  tracks,
  duration,
  currentTime,
  onSeek,
  onTrackMuteToggle,
  selectedLanguage,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);

  const pixelsPerSecond = 50 * zoom;
  const totalWidth = duration * pixelsPerSecond;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, duration)));
  };

  const generateTimeMarkers = () => {
    const markers = [];
    const interval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : 10;
    for (let i = 0; i <= duration; i += interval) {
      markers.push(i);
    }
    return markers;
  };

  // Generate pseudo-random waveform data for visual effect
  const generateWaveform = (segment: TimelineSegment, seed: number) => {
    const points: number[] = [];
    const width = (segment.endTime - segment.startTime) * pixelsPerSecond;
    const numPoints = Math.floor(width / 2);
    
    for (let i = 0; i < numPoints; i++) {
      // Pseudo-random based on seed and position
      const random = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
      const height = 0.3 + (random - Math.floor(random)) * 0.7;
      points.push(height);
    }
    return points;
  };

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Timeline Header */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">Zoom</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 accent-emerald-500"
          />
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex">
        {/* Track Labels */}
        <div className="w-40 flex-shrink-0 border-r border-gray-200 bg-gray-50">
          {/* Time ruler label */}
          <div className="h-8 border-b border-gray-200" />
          
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-12 flex items-center px-3 border-b border-gray-100 gap-2"
            >
              <button
                onClick={() => onTrackMuteToggle?.(track.id)}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                  track.muted ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {track.muted ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <div className="flex items-center gap-2">
                {track.type === 'speaker' && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                )}
                <span className="text-xs text-gray-600 truncate">{track.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Tracks */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto"
          onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        >
          <div style={{ width: Math.max(totalWidth, 600) }}>
            {/* Time Ruler */}
            <div
              className="h-8 border-b border-gray-200 relative cursor-pointer bg-gray-50"
              onClick={handleTimelineClick}
            >
              {generateTimeMarkers().map((time) => (
                <div
                  key={time}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <div className="h-2 w-px bg-gray-300" />
                  <span className="text-[10px] text-gray-500 mt-1">{formatTime(time)}</span>
                </div>
              ))}
              
              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-0.5 bg-emerald-500 z-10"
                style={{ left: currentTime * pixelsPerSecond }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-500 rounded-sm rotate-45" />
              </div>
            </div>

            {/* Track Rows */}
            {tracks.map((track, trackIndex) => (
              <div
                key={track.id}
                className="h-12 border-b border-gray-100 relative cursor-pointer"
                onClick={handleTimelineClick}
              >
                {/* Track Background */}
                <div className="absolute inset-0 bg-white" />
                
                {/* Segments */}
                {track.segments.map((segment, segIndex) => {
                  const waveform = generateWaveform(segment, trackIndex * 100 + segIndex);
                  const segmentWidth = (segment.endTime - segment.startTime) * pixelsPerSecond;
                  
                  return (
                    <div
                      key={segment.id}
                      className="absolute top-1 bottom-1 rounded overflow-hidden"
                      style={{
                        left: segment.startTime * pixelsPerSecond,
                        width: segmentWidth,
                        backgroundColor: track.type === 'speaker' 
                          ? `${track.color}20` 
                          : track.type === 'background' 
                            ? '#3b82f620' 
                            : '#6b728020',
                      }}
                    >
                      {/* Waveform visualization */}
                      <div className="absolute inset-0 flex items-center justify-around px-0.5">
                        {waveform.map((height, i) => (
                          <div
                            key={i}
                            className="w-0.5 rounded-full"
                            style={{
                              height: `${height * 80}%`,
                              backgroundColor: track.type === 'speaker'
                                ? track.color
                                : track.type === 'background'
                                  ? '#60a5fa'
                                  : '#9ca3af',
                              opacity: track.muted ? 0.3 : 0.8,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Playhead line */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-emerald-500 z-10 pointer-events-none"
                  style={{ left: currentTime * pixelsPerSecond }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
