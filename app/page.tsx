'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoUpload from '@/components/VideoUpload';
import LanguageSelector from '@/components/LanguageSelector';

export default function Home() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_lang', targetLanguage);
      formData.append('source_lang', 'auto');

      setUploadProgress(30);

      const response = await fetch('/api/dubbing', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create dubbing project');
      }

      const data = await response.json();
      setUploadProgress(100);

      // Store the video file URL for the studio page
      const videoUrl = URL.createObjectURL(selectedFile);
      sessionStorage.setItem('uploadedVideoUrl', videoUrl);
      sessionStorage.setItem('uploadedFileName', selectedFile.name);
      sessionStorage.setItem('targetLanguage', targetLanguage);
      
      // Store original transcript from Whisper (for Vercel deployment)
      if (data.originalTranscript) {
        sessionStorage.setItem('originalTranscript', JSON.stringify(data.originalTranscript));
      }

      // Navigate to studio page
      router.push(`/studio/${data.dubbing_id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">DubStudio</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            AI-Powered
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 text-sm mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Instant AI Dubbing
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Transform your videos into<br />
            <span className="text-emerald-500">any language</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto leading-relaxed">
            Upload your video and let AI handle the transcription, translation, and voice synthesis. 
            Perfect dubbing in seconds, not hours.
          </p>
        </div>

        <div className="space-y-8">
          {/* Step 1: Upload */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <h3 className="text-lg font-medium text-gray-900">Upload your video</h3>
            </div>
            <VideoUpload
              onFileSelect={setSelectedFile}
              disabled={isUploading}
            />
          </div>

          {/* Step 2: Select Language */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h3 className="text-lg font-medium text-gray-900">Select target language</h3>
            </div>
            <LanguageSelector
              value={targetLanguage}
              onChange={setTargetLanguage}
              disabled={isUploading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Processing video...</span>
                <span className="text-emerald-600">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className={`
              w-full py-4 rounded-lg font-medium text-lg transition-all
              ${selectedFile && !isUploading
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-lg shadow-emerald-500/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isUploading ? 'Processing...' : 'Start Dubbing'}
          </button>

          {/* Info */}
          <p className="text-center text-sm text-gray-500">
            Supported formats: MP4, MOV, WebM • Max file size: 500MB
          </p>
        </div>
      </main>
    </div>
  );
}
