import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { LLMProvider } from "./provider";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  async generate(prompt: string): Promise<string> {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
