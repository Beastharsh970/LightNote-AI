import { env } from "../../config/env";
import { ParsedInstruction, ParsedInstructionSchema } from "../../types";
import { LLMProvider, buildParsePrompt, extractJSON } from "./provider";
import { GeminiProvider } from "./geminiProvider";
import { OpenAIProvider } from "./openaiProvider";
import { QwenProvider } from "./qwenProvider";

/**
 * Get the configured LLM provider based on AI_PROVIDER env var.
 * Follows the same multi-provider pattern from Skillbridge-ai.
 */
export function getProvider(): LLMProvider {
  switch (env.AI_PROVIDER) {
    case "openai":
      return new OpenAIProvider();
    case "qwen":
      return new QwenProvider();
    case "gemini":
    default:
      return new GeminiProvider();
  }
}

/**
 * Use the configured LLM to parse a user's natural-language instruction
 * into a structured ParsedInstruction.
 */
export async function parseInstruction(
  userPrompt: string
): Promise<ParsedInstruction> {
  const provider = getProvider();
  const llmPrompt = buildParsePrompt(userPrompt);

  const rawResponse = await provider.generate(llmPrompt);
  console.log(`[AI/${provider.name}] Raw response:`, rawResponse);

  const parsed = extractJSON(rawResponse);
  // Validate with Zod
  const instruction = ParsedInstructionSchema.parse(parsed);
  return instruction;
}

export { LLMProvider };
