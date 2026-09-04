import { z } from "zod";

// ---------- Parsed Instruction Schema ----------

export const ParsedInstructionSchema = z.object({
  operation: z.enum(["replace_object", "remove_object"]),
  target: z.string().min(1),
  replacement: z.string().optional(),
});

export type ParsedInstruction = z.infer<typeof ParsedInstructionSchema>;

// ---------- Job Statuses ----------

export type JobStatus = "uploaded" | "processing" | "completed" | "failed";

// ---------- Processing Steps ----------

export type ProcessingStep =
  | "Understanding prompt"
  | "Extracting frames"
  | "Detecting target object"
  | "Generating mask"
  | "Tracking object"
  | "Replacing object"
  | "Removing object"
  | "Rebuilding video"
  | "Completed";

// ---------- API Response ----------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ---------- Job Data ----------

export interface JobData {
  jobId: string;
  status: JobStatus;
  progress: number;
  currentStep: string;
  error?: {
    code: string;
    message: string;
  };
  outputVideoPath?: string;
  createdAt: Date;
  updatedAt: Date;
}
