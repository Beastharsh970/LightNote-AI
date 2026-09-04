import fs from "fs";
import path from "path";
import { ProcessingJob, IProcessingJob } from "../../models/ProcessingJob";
import { parseInstruction } from "../ai";
import {
  extractFrames,
  rebuildVideo,
  cleanupTemp,
  getVideoMetadata,
} from "./ffmpegService";
import {
  detectObjectInFrame,
  replaceObjectInFrame,
  removeObjectInFrame,
  trackBoundingBox,
  BoundingBox,
} from "./imageProcessor";

/**
 * Update job progress in MongoDB.
 */
async function updateJob(
  jobId: string,
  update: Partial<IProcessingJob>
): Promise<void> {
  await ProcessingJob.findByIdAndUpdate(jobId, update);
}

/**
 * Main video processing pipeline — runs as a background job.
 *
 * Pipeline stages:
 * 1. Understand prompt (LLM)
 * 2. Extract frames (FFmpeg)
 * 3. Detect target object (LLM + heuristics)
 * 4. Track object across frames
 * 5. Replace or remove object (sharp)
 * 6. Rebuild video (FFmpeg)
 */
export async function processVideoJob(jobId: string): Promise<void> {
  try {
    const job = await ProcessingJob.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await updateJob(jobId, {
      status: "processing",
      progress: 5,
      currentStep: "Understanding prompt",
    });

    // ── Step 1: Parse prompt with LLM ──────────────────────────────────
    let instruction;
    try {
      instruction = await parseInstruction(job.prompt);
    } catch (err: any) {
      await updateJob(jobId, {
        status: "failed",
        progress: 0,
        currentStep: "Failed",
        error: {
          code: "INVALID_INSTRUCTION",
          message: `Could not parse instruction: ${err.message}`,
        },
      });
      return;
    }

    await updateJob(jobId, {
      parsedInstruction: instruction,
      progress: 15,
      currentStep: "Extracting frames",
    });

    console.log(`[Pipeline] Parsed instruction:`, instruction);

    // ── Step 2: Get video metadata and extract frames ──────────────────
    const metadata = await getVideoMetadata(job.originalVideoPath);
    console.log(`[Pipeline] Video metadata:`, metadata);

    // Extract at lower FPS for processing efficiency
    const extractFps = Math.min(5, metadata.fps);
    const { framesDir, frameCount } = await extractFrames(
      job.originalVideoPath,
      jobId,
      extractFps
    );

    if (frameCount === 0) {
      await updateJob(jobId, {
        status: "failed",
        error: {
          code: "NO_FRAMES",
          message: "Could not extract any frames from the video",
        },
      });
      return;
    }

    console.log(`[Pipeline] Extracted ${frameCount} frames`);

    await updateJob(jobId, {
      progress: 30,
      currentStep: "Detecting target object",
    });

    // ── Step 3: Detect object in first frame ───────────────────────────
    const firstFrame = path.join(framesDir, "frame_0001.png");
    const bbox = await detectObjectInFrame(firstFrame, instruction.target);

    if (!bbox) {
      await updateJob(jobId, {
        status: "failed",
        error: {
          code: "TARGET_NOT_FOUND",
          message: `The requested object "${instruction.target}" could not be detected in the video.`,
        },
      });
      cleanupTemp(jobId);
      return;
    }

    console.log(`[Pipeline] Detected object:`, bbox);

    await updateJob(jobId, {
      progress: 40,
      currentStep: "Generating mask",
    });

    // ── Step 4: Track and process each frame ───────────────────────────
    const frameFiles = fs
      .readdirSync(framesDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    const stepLabel =
      instruction.operation === "replace_object"
        ? "Replacing object"
        : "Removing object";

    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = path.join(framesDir, frameFiles[i]);

      // Track bbox across frames (simulates object tracking)
      const trackedBbox = trackBoundingBox(bbox, i, frameFiles.length);

      if (instruction.operation === "replace_object") {
        await replaceObjectInFrame(
          framePath,
          trackedBbox,
          job.referenceImagePath
        );
      } else {
        await removeObjectInFrame(framePath, trackedBbox);
      }

      // Update progress: 40% → 85% during frame processing
      const frameProgress = 40 + Math.round((i / frameFiles.length) * 45);
      if (i % 5 === 0 || i === frameFiles.length - 1) {
        await updateJob(jobId, {
          progress: frameProgress,
          currentStep: `${stepLabel} (${i + 1}/${frameFiles.length})`,
        });
      }
    }

    console.log(`[Pipeline] Processed ${frameFiles.length} frames`);

    await updateJob(jobId, {
      progress: 85,
      currentStep: "Rebuilding video",
    });

    // ── Step 5: Rebuild video from processed frames ────────────────────
    const outputPath = await rebuildVideo(
      framesDir,
      jobId,
      extractFps,
      job.originalVideoPath
    );

    console.log(`[Pipeline] Output video:`, outputPath);

    // ── Step 6: Mark complete ──────────────────────────────────────────
    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      currentStep: "Completed",
      outputVideoPath: outputPath,
    });

    // Cleanup temp files
    cleanupTemp(jobId);

    console.log(`[Pipeline] Job ${jobId} completed successfully`);
  } catch (err: any) {
    console.error(`[Pipeline] Job ${jobId} failed:`, err);
    await updateJob(jobId, {
      status: "failed",
      currentStep: "Failed",
      error: {
        code: "PROCESSING_ERROR",
        message: err.message || "An unexpected error occurred during processing",
      },
    });
    cleanupTemp(jobId);
  }
}
