import type { McpUiAppToolConfig } from "@modelcontextprotocol/ext-apps/server";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ZodRawShapeCompat,
  ShapeOutput,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@saas/logger";

interface ToolContext {
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>;
}

interface ToolOutput {
  text: string;
  content: Record<string, unknown>;
  _meta?: CallToolResult["_meta"];
  annotations?: CallToolResult["content"][0]["annotations"];
  data?: string;
  mimeType?: string;
  type?: "image";
}

const toToolResult = (output: ToolOutput): CallToolResult => {
  const result = {
    structuredContent: output.content,
    _meta: output._meta,
  };

  const type = output.type ?? "text";

  switch (type) {
    case "image": {
      if (!output.data || !output.mimeType) {
        throw new Error(
          "Output of type image requires 'data' and 'mimeType' fields",
        );
      }

      return {
        content: [
          {
            type,
            data: output.data,
            mimeType: output.mimeType,
            annotations: output.annotations,
            _meta: output._meta,
          },
        ],
        ...result,
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: output.text,
            annotations: output.annotations,
            _meta: output._meta,
          },
        ],
        ...result,
      };
  }
};

export const tool = <T extends ZodRawShapeCompat>(
  name: string,
  config: Omit<McpUiAppToolConfig, "inputSchema" | "_meta"> & {
    inputSchema?: T;
    _meta?: McpUiAppToolConfig["_meta"];
  },
  executor: (
    input: ShapeOutput<T>,
    context: ToolContext,
  ) => Promise<ToolOutput> | ToolOutput,
) => {
  const _config: McpUiAppToolConfig = {
    ...config,
    inputSchema: config.inputSchema ?? {},
    outputSchema: config.outputSchema ?? {},
    _meta: config._meta ?? {},
  };

  return {
    name,
    config: _config,
    handler: async (
      input: ShapeOutput<T>,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ): Promise<CallToolResult> => {
      try {
        const output = await executor(input, { extra });
        return toToolResult(output);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";

        logger.error(`[tool:${name}]`, error);

        return {
          isError: true,
          content: [{ type: "text", text: message }],
        };
      }
    },
  };
};
