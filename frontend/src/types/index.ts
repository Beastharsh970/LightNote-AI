export interface JobResponse {
  jobId: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  parsedInstruction?: {
    operation: string;
    target: string;
    replacement?: string;
  };
  provider: string;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
