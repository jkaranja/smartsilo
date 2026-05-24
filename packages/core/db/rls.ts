import { sql } from "kysely";
import type { KyselyContext, KyselyTxn } from "./types";
import { kysely } from "./init";

export const setRls = (trx: KyselyTxn, orgId: string): Promise<void> =>
  sql`SET LOCAL "app.current_org" = ${sql.lit(orgId)}`.execute(trx).then(() => undefined);

export const txn = <T>(
  orgId: string,
  fn: (db: KyselyTxn) => Promise<T>,
  db: KyselyContext = kysely,
): Promise<T> =>
  db.transaction().execute(async (trx) => {
    await setRls(trx, orgId);
    return fn(trx);
  });
