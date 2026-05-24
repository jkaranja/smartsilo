import { sql } from "kysely";
import type { KyselyContext, KyselyTxn } from "./types";
import { kysely } from "./init";

export const txn = <T>(
  orgId: string,
  fn: (db: KyselyTxn) => Promise<T>,
  db: KyselyContext = kysely,
): Promise<T> =>
  db.transaction().execute(async (trx) => {
    // Scopes all RLS policies in this transaction to the given org — SET LOCAL expires when the transaction ends
    await sql`SET LOCAL "app.current_tenant" = ${sql.lit(orgId)}`.execute(trx);
    return fn(trx);
  });
