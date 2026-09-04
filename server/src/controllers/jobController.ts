import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { ProcessingJob } from "../models/ProcessingJob";
import { processVideoJob } from "../services/video/pipeline";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "../types";

/**
 * POST /api/jobs
 * Create a new video processing job.
 */
export async function createJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validate video
    if (!files?.video?.[0]) {
      throw new AppError("Video file is required", 400, "MISSING_VIDEO");
    }

    // Validate prompt
    const prompt = req.body.prompt?.trim();
    if (!prompt) {
      throw new AppError("Instruction prompt is required", 400, "MISSING_PROMPT");
    }

    const videoFile = files.video[0];
    const referenceImage = files?.referenceImage?.[0];

    // Create job in MongoDB
    const job = await ProcessingJob.create({
      originalVideoPath: videoFile.path,
      referenceImagePath: referenceImage?.path,
      prompt,
      provider: env.AI_PROVIDER,
      status: "uploaded",
      progress: 0,
      currentStep: "Uploaded",
    });

    console.log(`[Job] Created job ${job._id} for prompt: "${prompt}"`);

    // Start processing in background (fire-and-forget)
    processVideoJob(job._id.toString()).catch((err) => {
      console.error(`[Job] Background processing failed for ${job._id}:`, err);
    });

    const response: ApiResponse = {
      success: true,
      data: {
        jobId: job._id,
        status: job.status,
      },
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:jobId
 * Get job status, progress, and current step.
 */
export async function getJobStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.params;
    const job = await ProcessingJob.findById(jobId);

    if (!job) {
      throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        jobId: job._id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        parsedInstruction: job.parsedInstruction,
        provider: job.provider,
        error: job.error?.code ? job.error : undefined,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:jobId/output
 * Stream the processed output video.
 */
export async function getJobOutput(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.params;
    const job = await ProcessingJob.findById(jobId);

    if (!job) {
      throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
    }

    if (job.status !== "completed" || !job.outputVideoPath) {
      throw new AppError(
        "Output video is not ready yet",
        400,
        "OUTPUT_NOT_READY"
      );
    }

    if (!fs.existsSync(job.outputVideoPath)) {
      throw new AppError(
        "Output video file not found on disk",
        404,
        "OUTPUT_FILE_MISSING"
      );
    }

    const stat = fs.statSync(job.outputVideoPath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="output_${jobId}.mp4"`
    );

    const stream = fs.createReadStream(job.outputVideoPath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/health
 * Health check endpoint.
 */
export async function healthCheck(
  _req: Request,
  res: Response
): Promise<void> {
  res.json({
    success: true,
    data: {
      status: "ok",
      provider: env.AI_PROVIDER,
      timestamp: new Date().toISOString(),
    },
  });
}
