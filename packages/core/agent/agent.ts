import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ApprovalChannel } from "./approval";

export type Message = Anthropic.MessageParam;

interface AgentConfig {
  model: string;
  maxTokens?: number;
  apiKey?: string;
}

interface ServerConfig {
  url: string;
  authToken?: string;
  name?: string;
  tools: Tool[];
}

interface RunParams {
  message: Anthropic.MessageParam;
  threadMessages?: Anthropic.MessageParam[];
  systemPrompt?: string;
  serverConfigs: ServerConfig[];
}

interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

interface Tool extends Anthropic.Tool {
  annotations?: ToolAnnotations;
}

interface ServerConnection {
  client: Client;
  url: string;
}

export class Agent {
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;
  private connections: ServerConnection[] = [];
  readonly approvalChannel = new ApprovalChannel();

  constructor({ model, maxTokens = 4096, apiKey }: AgentConfig) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  // Entry point. Connects to all MCP connections, fetches their tools, builds message
  // history, then drives the loop: call model → yield stream events →
  // execute tool calls → repeat until end_turn.

  // this is a generator-a pausable function using yield(a return that doesn't terminate execution)
  // generator is an async iterator that is looped over using for await loop
  // for await must is like a normal for of but only works with async iterators awaiting the yielded value
  // You terminate the execution of a generator using return
  async *run({
    message,
    threadMessages = [],
    systemPrompt,
    serverConfigs,
  }: RunParams) {
    const allTools = serverConfigs.flatMap((s) => s.tools);

    const messages = [...threadMessages, message];

    while (true) {
      //1. give the model the messages and all tools
      // stream is itself a generator/async iterator. The for await will run until the SDK(which keep the stream yielding events) terminates the execution
      const stream = this.stream(messages, allTools, systemPrompt);

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "text_delta", text: event.delta.text };
        }
      }

      const response = await stream.finalMessage();

      //2. model will return end_turn if it doesn't think a tool is needed and has everything it needs to return a response
      // we will yield and break out of while loop
      if (response.stop_reason === "end_turn") {
        yield { type: "done" };
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      // 3. At this point, the model needs to use a tool(s).
      // we will skip text block which were already streamed to the caller earlier in the for await
      // at this point, we only care about what tools need to be called
      // look over the res.content array and call tools and push results
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        // before tool call, yield some feedback
        yield { type: "tool_call", tool: block.name, input: block.input };

        // call a tool for each block and return success or error objects
        const result = await this.handleToolUse(block, allTools, serverConfigs);

        // push each tool result
        toolResults.push(result);

        if (!result.is_error) {
          yield {
            type: "tool_result" as const,
            tool: block.name,
            result: result.content,
          };
        }
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      // END of first turn/iteration/while loop
      // at this point, the while loop runs again,
      // calls stream again with updates messages(+tool results)
      // if the tool results gave the model everything it needed, it will end_turn
      // else it can decide to keep calling tools until it call end_turn
      // That's exactly why the while(true) exists — there's no way to know upfront how many tool-calling turns the model will need. It could be 1, it could be 5.
      // The loop just keeps going until the model is satisfied and returns end_turn.
    }
  }

  // Makes the Anthropic streaming API call with the current message history and
  // full tool list. Returns a stream so text deltas can be yielded in real time.
  private stream(
    messages: Anthropic.MessageParam[],
    tools: Tool[],
    systemPrompt?: string,
  ) {
    return this.anthropic.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    });
  }

  private async handleToolUse(
    block: Anthropic.ToolUseBlock,
    tools: Tool[],
    serverConfigs: ServerConfig[],
  ) {
    const toolMeta = tools.find((t) => t.name === block.name);
    // now, given a tool, check it's metadata to see if approval is required(human in the loop/approval)
    // if yes, call waitFor(returns a Promise that just sits unresolved) to freeze the agent mid execution/pause
    // until we call this.approvalChannel.resolve externally to continue
    // if this is not called after 5 min, the promise resolves with a false and tool call is cancelled
    if (this.requiresApproval(toolMeta) && this.approvalChannel) {
      const approvalId = crypto.randomUUID();
      const approved = await this.approvalChannel.waitFor(approvalId);

      if (!approved) {
        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: "Action cancelled by user",
        };
      }
    }

    const serverConfig = serverConfigs.find((s) =>
      s.tools.some((t) => t.name === block.name),
    );

    if (!serverConfig) {
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: `Unknown tool: ${block.name}`,
        is_error: true,
      };
    }

    let connection = this.connections.find((c) => c.url === serverConfig.url);

    if (!connection) {
      connection = await this.connectToServer(serverConfig);
      this.connections.push(connection);
    }

    try {
      const result = await connection.client.callTool({
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });

      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(result.content),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: `Error: ${message}`,
        is_error: true,
      };
    }
  }

  private async connectToServer(server: ServerConfig) {
    const transport = new StreamableHTTPClientTransport(
      new URL(server.url),
      server.authToken
        ? {
            requestInit: {
              headers: { Authorization: `Bearer ${server.authToken}` },
            },
          }
        : undefined,
    );

    const client = new Client({ name: "saas-agent", version: "1.0.0" });

    await client.connect(transport);

    return { client, url: server.url };
  }

  // Checks MCP-standard destructiveHint annotation — works for both platform
  // tools (annotations stashed as _annotations) and external MCP server tools
  // (annotations passed through directly by the MCP SDK).
  private requiresApproval(tool: Tool | undefined) {
    if (!tool) return false;
    return tool.annotations?.readOnlyHint !== true;
  }
}
