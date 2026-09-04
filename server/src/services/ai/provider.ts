import { ParsedInstruction } from "../../types";

/**
 * LLMProvider interface — the rest of the backend depends only on this.
 * Concrete providers (Gemini, OpenAI, Qwen) implement this interface.
 */
export interface LLMProvider {
  readonly name: string;

  /**
   * Send a prompt to the LLM and get raw text back.
   */
  generate(prompt: string): Promise<string>;
}

/**
 * Build the system prompt that asks any LLM to parse a user's video-editing
 * instruction into structured JSON.
 */
export function buildParsePrompt(userInstruction: string): string {
  return `You are an AI assistant that parses video-editing instructions.

Given the user's instruction, extract the operation details and return ONLY valid JSON (no markdown, no explanation).

Supported operations:
- "replace_object": Replace one object with another. Requires "target" and "replacement".
- "remove_object": Remove an object from the video. Requires "target" only.

Output schema:
{
  "operation": "replace_object" | "remove_object",
  "target": "<object to find in the video>",
  "replacement": "<replacement object or description>" // omit for remove_object
}

User instruction: "${userInstruction}"

Respond with JSON only.`;
}

/**
 * Parse the LLM's raw text response into a validated ParsedInstruction.
 */
export function extractJSON(raw: string): Record<string, unknown> {
  // Try to find JSON in the response (handles markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in LLM response");
  }
  return JSON.parse(jsonMatch[0]);
}
