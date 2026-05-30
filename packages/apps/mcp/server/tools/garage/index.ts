import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OperationContext } from "@saas/types";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { lib, services } from "@saas/garage";
import { tool } from "../../lib/common/tool";

const listParts = tool(
  "list_parts",
  {
    description: lib.services.inventory.parts.ListSchema.description ?? "",
    inputSchema: lib.services.inventory.parts.ListSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await services.inventory.parts.list((ctx as any).db, input);
    return { text: JSON.stringify(result), content: { result } };
  },
);

const checkStock = tool(
  "check_part_stock",
  {
    description: lib.services.inventory.parts.GetSchema.description ?? "",
    inputSchema: lib.services.inventory.parts.GetSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await services.inventory.parts.getBySku(
      (ctx as any).db,
      input,
    );
    return { text: JSON.stringify(result), content: { result } };
  },
);

const listWorkOrders = tool(
  "list_work_orders",
  {
    description: lib.services.jobs.workOrders.ListSchema.description ?? "",
    inputSchema: lib.services.jobs.workOrders.ListSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await services.jobs.workOrders.list((ctx as any).db, input);
    return { text: JSON.stringify(result), content: { result } };
  },
);

const getWorkOrder = tool(
  "get_work_order",
  {
    description: lib.services.jobs.workOrders.GetSchema.description ?? "",
    inputSchema: lib.services.jobs.workOrders.GetSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await services.jobs.workOrders.get((ctx as any).db, input);
    return { text: JSON.stringify(result), content: { result } };
  },
);

export const registerGarageTools = (
  server: McpServer,
  ctx: OperationContext,
) => {
  registerAppTool(server, listParts.name, listParts.config, listParts.handler);

  registerAppTool(
    server,
    checkStock.name,
    checkStock.config,
    checkStock.handler,
  );
  registerAppTool(
    server,
    listWorkOrders.name,
    listWorkOrders.config,
    listWorkOrders.handler,
  );
  registerAppTool(
    server,
    getWorkOrder.name,
    getWorkOrder.config,
    getWorkOrder.handler,
  );
};
