import type { KyselyContext } from "@saas/db";
import type {
  ListOrders,
  GetOrder,
  CreateOrder,
  UpdateOrderStatus,
} from "../../lib";

export const list = async (db: KyselyContext, input: ListOrders) => [];

export const get = async (db: KyselyContext, input: GetOrder) => null;

export const create = async (db: KyselyContext, input: CreateOrder) => null;

export const updateStatus = async (
  db: KyselyContext,
  input: UpdateOrderStatus,
) => null;

export default { list, get, create, updateStatus };
