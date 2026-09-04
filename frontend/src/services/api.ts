import axios from 'axios';
import type { ApiResponse, JobResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
});

/**
 * Create a new processing job by uploading a video, optional reference image, and prompt.
 */
export async function createJob(
  video: File,
  prompt: string,
  referenceImage?: File
): Promise<{ jobId: string; status: string }> {
  const formData = new FormData();
  formData.append('video', video);
  formData.append('prompt', prompt);
  if (referenceImage) {
    formData.append('referenceImage', referenceImage);
  }

  const { data } = await api.post<ApiResponse<{ jobId: string; status: string }>>(
    '/jobs',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

  if (!data.success || !data.data) {
    throw new Error(data.error?.message || 'Failed to create job');
  }

  return data.data;
}

/**
 * Get the current status of a job.
 */
export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const { data } = await api.get<ApiResponse<JobResponse>>(`/jobs/${jobId}`);

  if (!data.success || !data.data) {
    throw new Error(data.error?.message || 'Failed to get job status');
  }

  return data.data;
}

/**
 * Get the URL for the output video.
 */
export function getOutputVideoUrl(jobId: string): string {
  return `/api/jobs/${jobId}/output`;
}

/**
 * Health check.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const { data } = await api.get('/health');
    return data.success;
  } catch {
    return false;
  }
}
