import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParsedInstructionSchema } from "../types";
import { buildParsePrompt, extractJSON } from "../services/ai/provider";

// ---------- ParsedInstruction Schema Validation ----------

describe("ParsedInstructionSchema", () => {
  it("validates a correct replace_object instruction", () => {
    const result = ParsedInstructionSchema.safeParse({
      operation: "replace_object",
      target: "Coca-Cola bottle",
      replacement: "Pepsi bottle",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operation).toBe("replace_object");
      expect(result.data.target).toBe("Coca-Cola bottle");
      expect(result.data.replacement).toBe("Pepsi bottle");
    }
  });

  it("validates a correct remove_object instruction", () => {
    const result = ParsedInstructionSchema.safeParse({
      operation: "remove_object",
      target: "laptop",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsupported operation", () => {
    const result = ParsedInstructionSchema.safeParse({
      operation: "resize_object",
      target: "bottle",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing target", () => {
    const result = ParsedInstructionSchema.safeParse({
      operation: "remove_object",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty target", () => {
    const result = ParsedInstructionSchema.safeParse({
      operation: "remove_object",
      target: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------- buildParsePrompt ----------

describe("buildParsePrompt", () => {
  it("includes the user instruction in the prompt", () => {
    const prompt = buildParsePrompt("Replace the car with a bus");
    expect(prompt).toContain("Replace the car with a bus");
    expect(prompt).toContain("replace_object");
    expect(prompt).toContain("remove_object");
  });
});

// ---------- extractJSON ----------

describe("extractJSON", () => {
  it("extracts JSON from a clean response", () => {
    const raw = '{"operation": "replace_object", "target": "bottle", "replacement": "can"}';
    const result = extractJSON(raw);
    expect(result.operation).toBe("replace_object");
  });

  it("extracts JSON from markdown code block", () => {
    const raw = '```json\n{"operation": "remove_object", "target": "cup"}\n```';
    const result = extractJSON(raw);
    expect(result.operation).toBe("remove_object");
  });

  it("extracts JSON with surrounding text", () => {
    const raw = 'Here is the result: {"operation": "remove_object", "target": "laptop"} Hope this helps!';
    const result = extractJSON(raw);
    expect(result.target).toBe("laptop");
  });

  it("throws on no JSON", () => {
    expect(() => extractJSON("no json here")).toThrow();
  });
});

// ---------- AI Provider Selection ----------

describe("AI Provider Selection", () => {
  it("returns gemini provider by default", async () => {
    // Set required env var so env.ts validation passes during dynamic import
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const { getProvider } = await import("../services/ai");
    const provider = getProvider();
    expect(provider.name).toBe("gemini");
  });
});

