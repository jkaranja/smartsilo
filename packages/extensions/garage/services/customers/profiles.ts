import type { KyselyContext } from "@saas/db";
import type {
  ListCustomers,
  GetCustomer,
  CreateCustomer,
  UpdateCustomer,
} from "../../lib";

export const list = async (db: KyselyContext, input: ListCustomers) => [];

export const get = async (db: KyselyContext, input: GetCustomer) => null;

export const create = async (db: KyselyContext, input: CreateCustomer) => null;

export const update = async (db: KyselyContext, input: UpdateCustomer) => null;

export default { list, get, create, update };
