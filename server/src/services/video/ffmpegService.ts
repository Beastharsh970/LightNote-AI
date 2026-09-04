import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { env } from "../../config/env";

// Configure FFmpeg and FFprobe paths (custom env path takes priority, followed by bundled installer)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

  const ffmpegPath = env.FFMPEG_PATH || ffmpegInstaller.path;
  const ffprobePath = env.FFPROBE_PATH || ffprobeInstaller.path;

  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);
} catch {
  if (env.FFMPEG_PATH) ffmpeg.setFfmpegPath(env.FFMPEG_PATH);
  if (env.FFPROBE_PATH) ffmpeg.setFfprobePath(env.FFPROBE_PATH);
}

const TEMP_DIR = path.join(__dirname, "../../../temp");
const OUTPUT_DIR = path.join(__dirname, "../../../output");

// Ensure dirs exist
[TEMP_DIR, OUTPUT_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
}

/**
 * Get metadata about a video file.
 */
export function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      if (!videoStream) return reject(new Error("No video stream found"));

      const fps = videoStream.r_frame_rate
        ? eval(videoStream.r_frame_rate) // e.g. "30/1" → 30
        : 30;

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 1920,
        height: videoStream.height || 1080,
        fps: Math.round(fps),
        codec: videoStream.codec_name || "h264",
      });
    });
  });
}

/**
 * Extract frames from a video at a given FPS rate.
 * Returns the directory containing extracted frames and total frame count.
 */
export async function extractFrames(
  videoPath: string,
  jobId: string,
  extractFps: number = 5
): Promise<{ framesDir: string; frameCount: number }> {
  const framesDir = path.join(TEMP_DIR, jobId, "frames");
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=${extractFps}`, "-q:v 2"])
      .output(path.join(framesDir, "frame_%04d.png"))
      .on("end", () => {
        const files = fs
          .readdirSync(framesDir)
          .filter((f) => f.endsWith(".png"));
        resolve({ framesDir, frameCount: files.length });
      })
      .on("error", reject)
      .run();
  });
}

/**
 * Rebuild video from processed frames.
 */
export async function rebuildVideo(
  framesDir: string,
  jobId: string,
  fps: number,
  originalVideoPath: string
): Promise<string> {
  const outputPath = path.join(OUTPUT_DIR, `${jobId}_output.mp4`);

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(path.join(framesDir, "frame_%04d.png"))
      .inputOptions([`-framerate ${fps}`])
      .input(originalVideoPath) // get audio from original
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-preset fast",
        "-crf 23",
        "-c:a aac",
        "-shortest",
        "-map 0:v:0",
        "-map 1:a:0?",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => {
        // If audio mapping fails, try without audio
        if (err.message?.includes("Stream map")) {
          ffmpeg()
            .input(path.join(framesDir, "frame_%04d.png"))
            .inputOptions([`-framerate ${fps}`])
            .outputOptions([
              "-c:v libx264",
              "-pix_fmt yuv420p",
              "-preset fast",
              "-crf 23",
            ])
            .output(outputPath)
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .run();
        } else {
          reject(err);
        }
      });
    cmd.run();
  });
}

/**
 * Clean up temp files for a job.
 */
export function cleanupTemp(jobId: string): void {
  const jobTempDir = path.join(TEMP_DIR, jobId);
  if (fs.existsSync(jobTempDir)) {
    fs.rmSync(jobTempDir, { recursive: true, force: true });
  }
}

export { TEMP_DIR, OUTPUT_DIR };
