import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { type LLMClientConfig } from "./init";

type LLMModel =
  | OpenAI.Responses.ResponseCreateParamsNonStreaming["model"]
  | Anthropic.Messages.MessageCreateParams["model"];

interface LLMInput {
  role: "user" | "developer";
  content: string;
}

interface CreateParams<Schema extends z.ZodTypeAny = z.ZodTypeAny> {
  model: LLMModel;
  input: LLMInput[];
  effort?: "low" | "medium" | "high";
  outputSchema: Schema;
  tools?: any[];
  maxTokens?: number;
  thinking?: Anthropic.Messages.ThinkingConfigParam;
}

export class LLMClient {
  private readonly openai: OpenAI | undefined;
  private readonly anthropic: Anthropic | undefined;

  constructor({ anthropicApiKey, openaiApiKey }: LLMClientConfig) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }

    if (anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    }
  }

  async create<Schema extends z.ZodTypeAny>({
    model,
    input,
    effort,
    outputSchema,
    tools,
    maxTokens = 16000,
    thinking,
  }: CreateParams<Schema>): Promise<z.infer<Schema>> {
    switch (model) {
      case "claude-opus-4-7":
      case "claude-opus-4-6":
      case "claude-opus-4-5":
      case "claude-sonnet-4-6":
      case "claude-sonnet-4-5":
      case "claude-haiku-4-5": {
        if (!this.anthropic) {
          throw new Error("Anthropic client not initialized");
        }

        const response = await this.anthropic.messages.parse({
          model,
          max_tokens: maxTokens,
          thinking,
          system: input
            .filter((i) => i.role === "developer")
            .map((i) => ({ type: "text", text: i.content })),
          messages: input
            .filter((i) => i.role === "user")
            .map((i) => ({ role: "user", content: i.content })),
          output_config: {
            ...(effort && { effort }),
            format: zodOutputFormat(outputSchema),
          },
          tools,
        });

        const anthropicOutput = response.parsed_output;

        if (!anthropicOutput) {
          throw new Error("LLM returned empty output");
        }

        return anthropicOutput as z.infer<Schema>;
      }

      case "gpt-5":
      case "gpt-5.1":
      case "gpt-5.2":
      case "gpt-5.4":
      case "gpt-5.4-mini":
      case "gpt-5.4-nano": {
        if (!this.openai) {
          throw new Error("OpenAI client not initialized");
        }

        const response = await this.openai.responses.parse({
          model,
          input,
          reasoning: { effort },
          text: {
            format: zodTextFormat(outputSchema, "output"),
          },
          tools,
        });

        const openaiOutput = response.output_parsed;

        if (!openaiOutput) {
          throw new Error("LLM returned empty output");
        }

        return openaiOutput;
      }

      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }
}
