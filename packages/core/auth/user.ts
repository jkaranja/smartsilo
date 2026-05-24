import { userQuery } from "@saas/dbops";

export const getAuthenticatedUser = async ({ userId }: { userId: string }) => {
  return userQuery({
    id: userId,
    include: { organizations: true },
  }).executeTakeFirst();
};

export type AuthenticatedUser = Awaited<
  ReturnType<typeof getAuthenticatedUser>
>;
