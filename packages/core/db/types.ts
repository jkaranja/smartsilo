import { Kysely, Transaction } from "kysely";
import type { DB } from "./.generated/kysely";

export type { ExpressionBuilder } from "kysely";
export type { DB } from "./.generated/kysely";
export * from "./.generated/kysely";

export type KyselyClient = Kysely<DB>;
export type KyselyTxn = Transaction<DB>;
export type KyselyContext = KyselyClient | KyselyTxn;
