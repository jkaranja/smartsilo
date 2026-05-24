import { DB } from "@saas/db";
import { userQuery } from "@saas/dbops";
export type {
  RequestContext,
  Role,
  GarageRole,
  ClinicRole,
  DealerRole,
} from "@saas/types";

export const getContext = async ({ userId }: { userId: string }) => {
  const db = DB.kysely;

  const user = await userQuery({
    kysely: db,
    id: userId,
    include: { organizations: true },
  }).executeTakeFirst();

  return { user, db };
};

export type Context = Awaited<ReturnType<typeof getContext>>;

export type AuthenticatedUser = Context["user"];
