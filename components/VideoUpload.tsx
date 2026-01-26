'use client';

import { useState, useCallback, useRef } from 'react';

interface VideoUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function VideoUpload({ onFileSelect, disabled }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        handleFile(file);
      }
    }
  }, [disabled]);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div
      className={`
        drop-zone relative rounded-xl border-2 border-dashed transition-all cursor-pointer
        ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${preview ? 'border-solid border-[#2a2a2a]' : ''}
      `}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      
      {preview ? (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <video
            src={preview}
            className="w-full h-full object-contain bg-black"
            muted
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-sm text-white truncate">{fileName}</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-sm">Click to change video</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-white mb-2">
            Drop your video here
          </p>
          <p className="text-sm text-gray-400 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-500">
            Supports MP4, MOV, WebM
          </p>
        </div>
      )}
    </div>
  );
}
