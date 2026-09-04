import OpenAI from "openai";
import { env } from "../../config/env";
import { LLMProvider } from "./provider";

export class QwenProvider implements LLMProvider {
  readonly name = "qwen";

  async generate(prompt: string): Promise<string> {
    if (!env.QWEN_API_KEY) {
      throw new Error("QWEN_API_KEY is not configured");
    }
    const client = new OpenAI({
      apiKey: env.QWEN_API_KEY,
      baseURL: env.QWEN_BASE_URL,
    });
    const completion = await client.chat.completions.create({
      model: env.QWEN_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant. Always respond with valid JSON only — no markdown, no explanation, just JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
    return completion.choices[0]?.message?.content || "";
  }
}
