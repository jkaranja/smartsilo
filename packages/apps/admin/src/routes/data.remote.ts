import { query, getRequestEvent } from "$app/server";

export const getDashboardStats = query(async () => {
  const { locals } = getRequestEvent();

  const row = await locals.db
    .selectFrom("Organization")
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();

  return { orgCount: Number(row?.count ?? 0) };
});
