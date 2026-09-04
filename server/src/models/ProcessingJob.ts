import mongoose, { Schema, Document } from "mongoose";
import { JobStatus } from "../types";

export interface IProcessingJob extends Document {
  originalVideoPath: string;
  referenceImagePath?: string;
  prompt: string;
  parsedInstruction?: {
    operation: string;
    target: string;
    replacement?: string;
  };
  provider: string;
  status: JobStatus;
  progress: number;
  currentStep: string;
  outputVideoPath?: string;
  error?: {
    code: string;
    message: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingJobSchema = new Schema<IProcessingJob>(
  {
    originalVideoPath: { type: String, required: true },
    referenceImagePath: { type: String },
    prompt: { type: String, required: true },
    parsedInstruction: {
      operation: { type: String },
      target: { type: String },
      replacement: { type: String },
    },
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed"],
      default: "uploaded",
    },
    progress: { type: Number, default: 0 },
    currentStep: { type: String, default: "Uploaded" },
    outputVideoPath: { type: String },
    error: {
      code: { type: String },
      message: { type: String },
    },
  },
  { timestamps: true }
);

export const ProcessingJob = mongoose.model<IProcessingJob>(
  "ProcessingJob",
  ProcessingJobSchema
);
