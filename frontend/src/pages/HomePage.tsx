import { useState, useEffect, useCallback, useRef } from 'react';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import VideoPlayer from '../components/VideoPlayer';
import { createJob, getJobStatus, getOutputVideoUrl } from '../services/api';
import type { JobResponse } from '../types';

export default function HomePage() {
  const [video, setVideo] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Poll for job status
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const status = await getJobStatus(id);
        setJobStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    pollRef.current = setInterval(poll, 2000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJobStatus(null);
    setJobId(null);

    if (!video) {
      setError('Please upload a video file.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter an instruction.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createJob(video, prompt.trim(), referenceImage || undefined);
      setJobId(result.jobId);
      startPolling(result.jobId);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to submit job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setVideo(null);
    setReferenceImage(null);
    setPrompt('');
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setSubmitting(false);
  };

  const isProcessing = jobStatus?.status === 'processing' || jobStatus?.status === 'uploaded';
  const isCompleted = jobStatus?.status === 'completed';
  const isFailed = jobStatus?.status === 'failed';

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LightNoteAI
          </h1>
          <span className="text-xs text-gray-600 ml-1">AI Video Editor</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload */}
          <FileUpload
            id="video-upload"
            label="Upload Video"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
            required
            hint="MP4, MOV, AVI, or WebM — max 100MB"
            onFileSelect={setVideo}
          />

          {/* Reference Image */}
          <FileUpload
            id="reference-image-upload"
            label="Reference Image (optional)"
            accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG, or WebP — used as the replacement object"
            onFileSelect={setReferenceImage}
          />

          {/* Prompt */}
          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Instruction <span className="text-red-400">*</span>
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Replace the bottle with Pepsi" or "Remove the laptop from the table"'
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl
                         text-gray-100 placeholder-gray-600 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         resize-none transition-all duration-200"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || isProcessing}
            className="w-full py-3 px-6 rounded-xl font-medium text-sm
                       bg-gradient-to-r from-indigo-600 to-purple-600
                       hover:from-indigo-500 hover:to-purple-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-white shadow-lg shadow-indigo-500/20
                       transition-all duration-200 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : isProcessing ? (
              'Processing...'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Process Video
              </>
            )}
          </button>
        </form>

        {/* Job Status */}
        {jobStatus && (
          <div className="mt-8 space-y-6">
            <div className="border-t border-gray-800 pt-6">
              <ProgressBar
                progress={jobStatus.progress}
                currentStep={jobStatus.currentStep}
                status={jobStatus.status}
              />
            </div>

            {/* Parsed Instruction */}
            {jobStatus.parsedInstruction && (
              <div className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm space-y-1">
                <p className="text-gray-400">
                  <span className="text-gray-500">Operation:</span>{' '}
                  <span className="text-indigo-400 font-mono">
                    {jobStatus.parsedInstruction.operation}
                  </span>
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Target:</span>{' '}
                  <span className="text-amber-400">{jobStatus.parsedInstruction.target}</span>
                </p>
                {jobStatus.parsedInstruction.replacement && (
                  <p className="text-gray-400">
                    <span className="text-gray-500">Replacement:</span>{' '}
                    <span className="text-emerald-400">
                      {jobStatus.parsedInstruction.replacement}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Failed */}
            {isFailed && jobStatus.error && (
              <div className="px-4 py-3 rounded-xl bg-red-950/50 border border-red-800 text-sm">
                <p className="text-red-300 font-medium">{jobStatus.error.code}</p>
                <p className="text-red-400 mt-1">{jobStatus.error.message}</p>
              </div>
            )}

            {/* Completed — Video Player */}
            {isCompleted && jobId && (
              <div className="border-t border-gray-800 pt-6">
                <VideoPlayer
                  src={getOutputVideoUrl(jobId)}
                  title="Output Video"
                />
              </div>
            )}

            {/* Reset button */}
            {(isCompleted || isFailed) && (
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium
                           border border-gray-700 text-gray-400
                           hover:bg-gray-800 hover:text-gray-300 transition-colors"
              >
                Start New Job
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 mt-16">
        <div className="max-w-3xl mx-auto px-6 py-4 text-center text-xs text-gray-700">
          LightNoteAI — AI-Powered Video Editing
        </div>
      </footer>
    </div>
  );
}
