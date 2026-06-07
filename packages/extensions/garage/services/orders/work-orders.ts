import type { KyselyContext } from "@saas/db";
import type {
  ListWorkOrders,
  GetWorkOrder,
  CreateWorkOrder,
  UpdateWorkOrder,
  CloseWorkOrder,
} from "../../lib";

export const list = async (db: KyselyContext, input: ListWorkOrders) => [];

export const get = async (db: KyselyContext, input: GetWorkOrder) => null;

export const create = async (db: KyselyContext, input: CreateWorkOrder) => null;

export const update = async (db: KyselyContext, input: UpdateWorkOrder) => null;

export const close = async (db: KyselyContext, input: CloseWorkOrder) => null;

export default { list, get, create, update, close };
