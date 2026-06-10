import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OperationContext } from "@saas/types";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { garage } from "@saas/extensions";
import { tool } from "../../lib/common/tool";

const listParts = tool(
  "list_parts",
  {
    description:
      garage.lib.services.inventory.parts.ListSchema.description ?? "",
    inputSchema: garage.lib.services.inventory.parts.ListSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await garage.services.inventory.parts.list(
      (ctx as any).db,
      input,
    );
    return { text: JSON.stringify(result), content: { result } };
  },
);

const checkStock = tool(
  "check_part_stock",
  {
    description:
      garage.lib.services.inventory.parts.GetSchema.description ?? "",
    inputSchema: garage.lib.services.inventory.parts.GetSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await garage.services.inventory.parts.getBySku(
      (ctx as any).db,
      input,
    );
    return { text: JSON.stringify(result), content: { result } };
  },
);

const listWorkOrders = tool(
  "list_work_orders",
  {
    description:
      garage.lib.services.orders.workOrders.ListSchema.description ?? "",
    inputSchema: garage.lib.services.orders.workOrders.ListSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await garage.services.orders.workOrders.list(
      (ctx as any).db,
      input,
    );
    return { text: JSON.stringify(result), content: { result } };
  },
);

const getWorkOrder = tool(
  "get_work_order",
  {
    description:
      garage.lib.services.orders.workOrders.GetSchema.description ?? "",
    inputSchema: garage.lib.services.orders.workOrders.GetSchema.shape,
    annotations: { readOnlyHint: true },
  },
  async (input, { extra, ...ctx }) => {
    const result = await garage.services.orders.workOrders.get(
      (ctx as any).db,
      input,
    );
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
