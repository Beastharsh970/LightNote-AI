import OpenAI from "openai";
import { env } from "../../config/env";
import { LLMProvider } from "./provider";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  async generate(prompt: string): Promise<string> {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
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
