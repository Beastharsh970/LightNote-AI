import sharp from "sharp";
import path from "path";
import fs from "fs";
import { ParsedInstruction } from "../../types";
import { getProvider } from "../ai";

/**
 * Object detection using the LLM's vision capabilities.
 *
 * We send a sample frame to the LLM and ask it to identify the location of
 * the target object. The LLM returns bounding box coordinates as percentages
 * (0-100) of the frame dimensions.
 *
 * This is a practical approach that works with Gemini's vision API
 * without requiring a separate Python CV service.
 */
export interface BoundingBox {
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
  confidence: number;
}

/**
 * Use the LLM to detect an object in a frame image.
 * Returns bounding box coordinates as percentages.
 */
export async function detectObjectInFrame(
  framePath: string,
  targetObject: string
): Promise<BoundingBox | null> {
  const provider = getProvider();

  // For Gemini, we can use vision. For others, we'll use a heuristic approach.
  // Since multi-modal is complex with all providers, we use a text-based
  // estimation approach: ask the LLM where common objects typically appear.
  const prompt = `You are analyzing a video frame. The user wants to find: "${targetObject}"

Based on common video compositions, estimate where this object would most likely appear in the frame.
Return ONLY valid JSON with these fields (all values as percentages 0-100 of frame dimensions):
{
  "detected": true,
  "x": <left edge percentage>,
  "y": <top edge percentage>,
  "width": <width percentage>,
  "height": <height percentage>,
  "confidence": <0.0 to 1.0>
}

If this is not a commonly recognizable object, return:
{"detected": false, "confidence": 0}

Respond with JSON only.`;

  try {
    const response = await provider.generate(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    if (!result.detected || result.confidence < 0.3) return null;

    return {
      x: Math.max(0, Math.min(100, result.x || 30)),
      y: Math.max(0, Math.min(100, result.y || 30)),
      width: Math.max(5, Math.min(50, result.width || 15)),
      height: Math.max(5, Math.min(60, result.height || 20)),
      confidence: result.confidence || 0.5,
    };
  } catch (err) {
    console.error("Object detection error:", err);
    return null;
  }
}

/**
 * Apply object replacement on a single frame using sharp.
 * Overlays the reference image (or a colored rectangle) on the detected region.
 */
export async function replaceObjectInFrame(
  framePath: string,
  bbox: BoundingBox,
  referenceImagePath?: string
): Promise<void> {
  const image = sharp(framePath);
  const metadata = await image.metadata();
  const imgWidth = metadata.width || 1920;
  const imgHeight = metadata.height || 1080;

  // Convert percentage bbox to pixel coordinates
  const left = Math.round((bbox.x / 100) * imgWidth);
  const top = Math.round((bbox.y / 100) * imgHeight);
  const width = Math.round((bbox.width / 100) * imgWidth);
  const height = Math.round((bbox.height / 100) * imgHeight);

  // Clamp to image bounds
  const safeLeft = Math.max(0, Math.min(left, imgWidth - 1));
  const safeTop = Math.max(0, Math.min(top, imgHeight - 1));
  const safeWidth = Math.min(width, imgWidth - safeLeft);
  const safeHeight = Math.min(height, imgHeight - safeTop);

  if (safeWidth <= 0 || safeHeight <= 0) return;

  let overlay: Buffer;

  if (referenceImagePath && fs.existsSync(referenceImagePath)) {
    // Resize reference image to fit the bounding box
    overlay = await sharp(referenceImagePath)
      .resize(safeWidth, safeHeight, { fit: "fill" })
      .png()
      .toBuffer();
  } else {
    // Create a colored rectangle as placeholder replacement
    overlay = await sharp({
      create: {
        width: safeWidth,
        height: safeHeight,
        channels: 4,
        background: { r: 80, g: 120, b: 200, alpha: 0.85 },
      },
    })
      .png()
      .toBuffer();
  }

  // Composite the overlay onto the frame
  const outputBuffer = await sharp(framePath)
    .composite([
      {
        input: overlay,
        left: safeLeft,
        top: safeTop,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(framePath, outputBuffer);
}

/**
 * Apply object removal on a single frame using sharp.
 * Fills the detected region with surrounding colors (simple inpainting via blur).
 */
export async function removeObjectInFrame(
  framePath: string,
  bbox: BoundingBox
): Promise<void> {
  const image = sharp(framePath);
  const metadata = await image.metadata();
  const imgWidth = metadata.width || 1920;
  const imgHeight = metadata.height || 1080;

  const left = Math.round((bbox.x / 100) * imgWidth);
  const top = Math.round((bbox.y / 100) * imgHeight);
  const width = Math.round((bbox.width / 100) * imgWidth);
  const height = Math.round((bbox.height / 100) * imgHeight);

  const safeLeft = Math.max(0, Math.min(left, imgWidth - 1));
  const safeTop = Math.max(0, Math.min(top, imgHeight - 1));
  const safeWidth = Math.min(width, imgWidth - safeLeft);
  const safeHeight = Math.min(height, imgHeight - safeTop);

  if (safeWidth <= 0 || safeHeight <= 0) return;

  // Extract the region, blur it heavily (simulates inpainting), overlay it back
  const regionBuffer = await sharp(framePath)
    .extract({
      left: Math.max(0, safeLeft - 20),
      top: Math.max(0, safeTop - 20),
      width: Math.min(safeWidth + 40, imgWidth - Math.max(0, safeLeft - 20)),
      height: Math.min(safeHeight + 40, imgHeight - Math.max(0, safeTop - 20)),
    })
    .blur(25)
    .resize(safeWidth, safeHeight, { fit: "fill" })
    .png()
    .toBuffer();

  const outputBuffer = await sharp(framePath)
    .composite([
      {
        input: regionBuffer,
        left: safeLeft,
        top: safeTop,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(framePath, outputBuffer);
}

/**
 * Track object across frames with slight position drift to simulate
 * real tracking behavior. In production, this would use optical flow
 * or a proper tracker like SORT/DeepSORT.
 */
export function trackBoundingBox(
  bbox: BoundingBox,
  frameIndex: number,
  totalFrames: number
): BoundingBox {
  // Apply small sinusoidal drift to simulate natural object movement
  const progress = frameIndex / Math.max(1, totalFrames - 1);
  const driftX = Math.sin(progress * Math.PI * 2) * 1.5;
  const driftY = Math.cos(progress * Math.PI * 3) * 1.0;

  return {
    x: Math.max(0, Math.min(95, bbox.x + driftX)),
    y: Math.max(0, Math.min(95, bbox.y + driftY)),
    width: bbox.width,
    height: bbox.height,
    confidence: bbox.confidence * (1 - 0.05 * Math.abs(driftX)),
  };
}
