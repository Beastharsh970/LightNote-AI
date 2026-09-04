import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // AI provider selection
  AI_PROVIDER: z.enum(["gemini", "openai", "qwen"]).default("gemini"),

  // Gemini
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),

  // OpenAI
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  // Qwen
  QWEN_API_KEY: z.string().default(""),
  QWEN_MODEL: z.string().default("qwen-plus"),
  QWEN_BASE_URL: z.string().default("https://dashscope.aliyuncs.com/compatible-mode/v1"),

  // FFmpeg
  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional(),
});

export const env = envSchema.parse(process.env);
